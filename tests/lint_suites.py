"""A local in a suite's main() that shares a name with something at module level shadows it for
the whole function, so the module's own version is gone from the first line - not from the
assignment. It cost three runs in two days: 'start' twice, then 'btn'. Python will not warn, so
this does.

    python3 tests/lint_suites.py
"""
import ast, io, os, sys

HERE = os.path.dirname(os.path.abspath(__file__))


def names(path):
    """Report a local that is read before it is first assigned, where the name also exists at
    module level. That is the real fault: Python makes the name local for the whole function, so
    the module's own version is gone from the first line and the read raises UnboundLocalError.
    A local that merely shares a name and is never read before its assignment is fine, and saying
    so would only be noise."""
    tree = ast.parse(io.open(path, encoding='utf-8').read())
    top = set()
    for n in tree.body:
        if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef)):
            top.add(n.name)
        elif isinstance(n, ast.Assign):
            top.update(t.id for t in n.targets if isinstance(t, ast.Name))
        elif isinstance(n, (ast.Import, ast.ImportFrom)):
            top.update(a.asname or a.name.split('.')[0] for a in n.names)
    out = {}
    for fn in [n for n in ast.walk(tree)
               if isinstance(n, (ast.FunctionDef, ast.AsyncFunctionDef))]:
        first_store, first_load = {}, {}
        for n in ast.walk(fn):
            if not isinstance(n, ast.Name):
                continue
            where = first_store if isinstance(n.ctx, ast.Store) else first_load
            if n.id not in where or n.lineno < where[n.id]:
                where[n.id] = n.lineno
        hit = sorted(k for k, ln in first_store.items()
                     if k in top and k != fn.name
                     and k in first_load and first_load[k] < ln)
        if hit:
            out[fn.name] = hit
    return out


def main():
    bad = 0
    for f in sorted(os.listdir(HERE)):
        if not f.endswith('.py') or f == os.path.basename(__file__):
            continue
        for fn, hit in names(os.path.join(HERE, f)).items():
            print(f'{f}: {fn}() shadows module-level {", ".join(hit)}')
            bad += 1
    print('No suite shadows a name of its own.' if not bad else f'{bad} to fix.')
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
