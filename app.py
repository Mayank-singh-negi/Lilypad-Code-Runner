from flask import Flask, render_template, request, jsonify
import re
import subprocess
import os

app = Flask(__name__)

@app.route('/')
def index():
    return render_template('index.html')

def tokenize(code):
    tokens = []
    token_specification = [
        ('NUMBER',   r'\d+'),
        ('KEYWORD',  r'[A-Za-z]+'),
        ('LPAREN',   r'\('),
        ('RPAREN',   r'\)'),
        ('SEMI',     r';'),
        ('WS',       r'\s+'),
        ('MISMATCH', r'.'),
    ]
    tok_regex = '|'.join('(?P<%s>%s)' % pair for pair in token_specification)
    for mo in re.finditer(tok_regex, code):
        kind = mo.lastgroup
        value = mo.group()
        if kind == 'WS': continue
        elif kind == 'MISMATCH':
            tokens.append({"type": "UNKNOWN", "value": value})
        else:
            tokens.append({"type": kind if kind != 'SEMI' else 'SEMICOLON', "value": value})
    return tokens

@app.route('/run', methods=['POST'])
def run():
    data = request.get_json()
    code = data.get('code', '')
    mode = data.get('mode', 'frog')
    
    if mode == 'c':
        return compile_c_code(code)
    else:
        return process_frog_code(code)

def compile_c_code(code):
    # Create temporary C file
    with open('temp.c', 'w') as f:
        f.write(code)
    
    try:
        # Compile C code
        result = subprocess.run(['gcc', 'temp.c', '-o', 'temp.exe'], 
                          capture_output=True, text=True, timeout=10)
        
        if result.returncode != 0:
            return jsonify({
                "error": f"Compilation Error: {result.stderr}",
                "output": ""
            })
        
        # Execute compiled code
        result = subprocess.run(['./temp.exe'], capture_output=True, text=True, timeout=10)
        
        # Clean up temporary files
        if os.path.exists('temp.c'):
            os.remove('temp.c')
        if os.path.exists('temp.exe'):
            os.remove('temp.exe')
            
        return jsonify({
            "output": result.stdout,
            "error": result.stderr if result.stderr else None
        })
        
    except subprocess.TimeoutExpired:
        return jsonify({
            "error": "Error: Compilation or execution timed out",
            "output": ""
        })
    except Exception as e:
        return jsonify({
            "error": f"Error: {str(e)}",
            "output": ""
        })

def process_frog_code(code):
    tokens = tokenize(code)
    lines = code.strip().split(';')
    actions = []
    
    ast = {"type": "Program", "statements": []}
    symbol_table = {}

    # Define regex patterns for commands
    pattern_let = re.compile(r'let\s+([a-zA-Z_]\w*)\s*=\s*(-?\d+)', re.IGNORECASE)
    pattern_move = re.compile(r'move(Right|Left)\(([-a-zA-Z0-9_]+)\)', re.IGNORECASE)
    pattern_jump = re.compile(r'jump\(\)', re.IGNORECASE)
    pattern_wait = re.compile(r'wait\(([-a-zA-Z0-9_]+)\)', re.IGNORECASE)
    pattern_spin = re.compile(r'spin\(\)', re.IGNORECASE)
    pattern_dash = re.compile(r'dash\(\)', re.IGNORECASE)
    pattern_glow = re.compile(r'glow\(\)', re.IGNORECASE)
    pattern_float = re.compile(r'float\(\)', re.IGNORECASE)

    semantics = {
        "steps_gt_0": {"rule": "steps > 0", "desc": "move steps > 0", "status": "NOT-USED"},
        "steps_lt_max": {"rule": "steps <= max", "desc": "n must be 1-10", "status": "NOT-USED"},
        "wait_pos": {"rule": "wait positive", "desc": "wait(n) where n > 0", "status": "NOT-USED"},
        "ids_valid": {"rule": "all IDs valid", "desc": "all command names known", "status": "PASS"} 
    }

    for line in lines:
        line = line.strip()
        if not line:
            continue

        stmt_node = {"type": "Statement", "command": "", "args": None, "error": False}
        ast["statements"].append(stmt_node)

        if match := pattern_let.match(line):
            name, value = match.groups()
            symbol_table[name] = {"type": "number", "value": int(value), "scope": "global"}
            stmt_node["command"] = "let"
            stmt_node["args"] = {"type": "Assignment", "name": name, "value": value}
            continue

        if match := pattern_move.match(line):
            direction, steps_str = match.groups()
            
            if steps_str in symbol_table:
                steps = symbol_table[steps_str]["value"]
                stmt_node["command"] = f"move{direction.title()}"
                stmt_node["args"] = {"type": "Variable", "name": steps_str, "resolved_value": steps}
            else:
                try:
                    steps = int(steps_str)
                    stmt_node["command"] = f"move{direction.title()}"
                    stmt_node["args"] = {"type": "Number", "value": steps}
                except ValueError:
                    semantics["ids_valid"]["status"] = "FAIL"
                    stmt_node["command"] = f"move{direction.title()}"
                    stmt_node["args"] = {"type": "Variable", "name": steps_str}
                    stmt_node["error"] = True
                    return jsonify({"error": f"Semantic error: Undefined variable '{steps_str}'", "semantics": list(semantics.values()), "tokens": tokens, "ast": ast, "symbols": symbol_table})
            
            if steps > 0:
                semantics["steps_gt_0"]["status"] = "PASS"
            else:
                semantics["steps_gt_0"]["status"] = "FAIL"
                stmt_node["error"] = True
                return jsonify({"error": f"Semantic error: move{direction.title()}({steps_str}) — steps must be > 0", "semantics": list(semantics.values()), "tokens": tokens, "ast": ast, "symbols": symbol_table})
            
            if steps <= 10:
                semantics["steps_lt_max"]["status"] = "PASS"
            else:
                semantics["steps_lt_max"]["status"] = "FAIL"
                stmt_node["error"] = True
                return jsonify({"error": f"Semantic error: move{direction.title()}({steps_str}) — max steps is 10", "semantics": list(semantics.values()), "tokens": tokens, "ast": ast, "symbols": symbol_table})

            actions.append({
                "type": "move",
                "direction": direction.lower(),
                "steps": steps
            })
        elif pattern_jump.match(line):
            stmt_node["command"] = "jump"
            actions.append({"type": "jump"})
        elif match := pattern_wait.match(line):
            time_str = match.group(1)
            
            if time_str in symbol_table:
                time = symbol_table[time_str]["value"]
                stmt_node["command"] = "wait"
                stmt_node["args"] = {"type": "Variable", "name": time_str, "resolved_value": time}
            else:
                try:
                    time = int(time_str)
                    stmt_node["command"] = "wait"
                    stmt_node["args"] = {"type": "Number", "value": time}
                except ValueError:
                    semantics["ids_valid"]["status"] = "FAIL"
                    stmt_node["command"] = "wait"
                    stmt_node["args"] = {"type": "Variable", "name": time_str}
                    stmt_node["error"] = True
                    return jsonify({"error": f"Semantic error: Undefined variable '{time_str}'", "semantics": list(semantics.values()), "tokens": tokens, "ast": ast, "symbols": symbol_table})

            if time > 0:
                semantics["wait_pos"]["status"] = "PASS"
            else:
                semantics["wait_pos"]["status"] = "FAIL"
                stmt_node["error"] = True
                return jsonify({"error": f"Semantic error: wait({time_str}) — duration must be positive", "semantics": list(semantics.values()), "tokens": tokens, "ast": ast, "symbols": symbol_table})
            actions.append({
                "type": "wait",
                "time": time
            })
        elif pattern_spin.match(line):
            stmt_node["command"] = "spin"
            actions.append({"type": "spin"})
        elif pattern_dash.match(line):
            stmt_node["command"] = "dash"
            actions.append({"type": "dash"})
        elif pattern_glow.match(line):
            stmt_node["command"] = "glow"
            actions.append({"type": "glow"})
        elif pattern_float.match(line):
            stmt_node["command"] = "float"
            actions.append({"type": "float"})
        else:
            semantics["ids_valid"]["status"] = "FAIL"
            stmt_node["command"] = line
            stmt_node["error"] = True
            return jsonify({"error": f"Semantic error: Invalid command '{line}'", "semantics": list(semantics.values()), "tokens": tokens, "ast": ast, "symbols": symbol_table})

    # Optimization Pass
    optimized_actions = []
    before_actions = list(actions)
    
    for a in actions:
        if not optimized_actions:
            optimized_actions.append(a.copy())
            continue
            
        prev = optimized_actions[-1]
        
        if a["type"] == "move" and prev["type"] == "move" and a["direction"] == prev["direction"]:
            prev["steps"] += a["steps"]
            prev["_merged"] = prev.get("_merged", 1) + 1
        elif a["type"] == "move" and prev["type"] == "move" and (
            (a["direction"] == "right" and prev["direction"] == "left") or
            (a["direction"] == "left" and prev["direction"] == "right")
        ):
            if a["steps"] == prev["steps"]:
                optimized_actions.pop()
            elif prev["steps"] > a["steps"]:
                prev["steps"] -= a["steps"]
                prev["_merged"] = prev.get("_merged", 1) + 1
            else:
                prev["direction"] = a["direction"]
                prev["steps"] = a["steps"] - prev["steps"]
                prev["_merged"] = prev.get("_merged", 1) + 1
        else:
            optimized_actions.append(a.copy())

    optimization_data = {
        "before": before_actions,
        "after": optimized_actions,
        "optimized": len(optimized_actions) < len(before_actions)
    }

    return jsonify({"actions": optimized_actions, "tokens": tokens, "semantics": list(semantics.values()), "ast": ast, "symbols": symbol_table, "optimization": optimization_data})

if __name__ == '__main__':
    app.run(debug=True)
