#!/usr/bin/env python3
"""Mechanical Fortran-77 -> JavaScript translator for the SSE fitting formulae.

It exists so that no coefficient or formula of Hurley, Pols & Tout (2000) is
ever retyped by hand: the JS in src/physics/sse_core.js is generated from the
Fortran distributed with COSMIC (https://github.com/COSMIC-PopSynth/COSMIC,
src/cosmic/src/SSE/*.f, zdata.h, mrenv.f), which descends from Hurley's
original SSE/BSE code.

Usage: python3 f2js.py <dir with Fortran> <out.js>
"""
import re, sys, os

SRC = sys.argv[1]
OUT = sys.argv[2]

KEEP = {
    # zfuncs
    'lzamsf', 'rzamsf', 'tbgbf', 'thookf', 'ltmsf', 'lalphf', 'lbetaf', 'lnetaf', 'lhookf',
    'rtmssse', 'ralphf', 'rbetaf', 'rgammf', 'rhookf', 'lbgbf', 'lbagbf', 'rgbf', 'ragbf',
    'mctmsf', 'mcheif', 'mheif', 'mcagbf', 'mbagbf', 'mcgbtf', 'lgbtf', 'mcgbf', 'lmcgbf',
    'lheif', 'lhef', 'rminf', 'thef', 'tblf', 'lzahbf', 'rzahbf', 'lzhef', 'rzhef', 'themsf',
    'rhehgf', 'rhegbf', 'lpertf', 'rpertf',
    'sse_zcnsts', 'sse_star', 'sse_hrdiag', 'mrenv',
}
# subroutines: how by-reference scalar outputs are returned
RET = {
    'sse_star': ['tm', 'tn'],
    'mrenv': ['menv', 'renv', 'k2e'],
    'sse_zcnsts': [],
}
STATE = {'sse_hrdiag'}
COMMONS = {'mscff': 'MSCFF', 'gbcff': 'GBCFF'}
GLOBAL_ARRAYS = ['xz', 'xt', 'xl', 'xr', 'xg', 'xh', 'mc_he', 'mc_co']


def read_statements(path):
    """Return list of logical statements (lower-cased, continuation joined)."""
    out = []
    for raw in open(path, encoding='latin-1').read().split('\n'):
        raw = raw.rstrip()
        if not raw.strip():
            continue
        if raw[0] in '*Cc!':
            continue
        # strip trailing ! comments (no string literals survive in kept code)
        if raw.strip().startswith('!'):
            continue
        if '!' in raw and "'" not in raw[:raw.index('!')]:
            raw = raw[:raw.index('!')].rstrip()
            if not raw.strip():
                continue
        if len(raw) > 5 and raw[:5].strip() == '' and raw[5] not in ' 0':
            out[-1] += ' ' + raw[6:].strip().lower()
        else:
            out.append(raw.strip().lower())
    return out


def split_units(stmts):
    units, cur = [], None
    for s in stmts:
        m = re.match(r'(?:real\*8\s+)?(function|subroutine)\s+(\w+)\s*\(([^)]*)\)', s)
        if m:
            cur = {'kind': m.group(1), 'name': m.group(2),
                   'args': [a.strip() for a in m.group(3).split(',')], 'body': []}
            continue
        if cur is None:
            continue
        if re.match(r'end(\s+(function|subroutine).*)?$', s):
            units.append(cur)
            cur = None
            continue
        cur['body'].append(s)
    return units


def match_paren(s, i):
    d = 0
    for j in range(i, len(s)):
        if s[j] == '(':
            d += 1
        elif s[j] == ')':
            d -= 1
            if d == 0:
                return j
    raise ValueError('unbalanced: ' + s)


def expr(e, arrays):
    for a, b in [('.lt.', ' < '), ('.le.', ' <= '), ('.gt.', ' > '), ('.ge.', ' >= '),
                 ('.eq.', ' === '), ('.ne.', ' !== '), ('.and.', ' && '), ('.or.', ' || '),
                 ('.not.', ' !'), ('.true.', ' true '), ('.false.', ' false ')]:
        e = e.replace(a, b)
    e = re.sub(r'(\d+\.?\d*|\.\d+)d([+-]?\d+)', r'\1e\2', e)
    e = re.sub(r'\b(%s)\s*\(\s*([a-z0-9_]+)\s*\)' % '|'.join(arrays), r'\1[\2]', e)
    e = re.sub(r'\b(max|min|log10|log|exp|sqrt|abs)\s*\(', r'Math.\1(', e)
    # Fortran -a**b means -(a**b); JS rejects a unary minus directly on a ** base
    e = re.sub(r'(^|[=(,]\s*)-\s*([a-z0-9_.\[\]]+\s*\*\*)', r'\1-1*\2', e)
    return e.strip()


def convert(unit, datas):
    name, args, body = unit['name'], unit['args'], unit['body']
    arrays = set(GLOBAL_ARRAYS)
    alias, local_arr, assigned, labels, lines = [], [], [], [], []

    # pass 1: declarations
    stmts = []
    for s in body:
        if re.match(r'(implicit|include|external|logical|real ran3|integer\b)', s) and not s.startswith('integer function'):
            continue
        m = re.match(r'common\s*/(\w+)/\s*(\w+)', s)
        if m:
            if m.group(1) in COMMONS:
                alias.append((m.group(2), COMMONS[m.group(1)]))
                arrays.add(m.group(2))
            continue
        if s.startswith('real*8'):
            for nm, dim in re.findall(r'(\w+)\((\d+)\)', s):
                arrays.add(nm)
                local_arr.append((nm, int(dim)))
            continue
        m = re.match(r'parameter\s*\((.*)\)$', s)
        if m:
            for part in m.group(1).split(','):
                stmts.append(part.strip())
            continue
        m = re.match(r'data\s+(\w+)\s*/(.*)/$', s)
        if m:
            datas[m.group(1)] = [x.strip() for x in m.group(2).split(',')]
            continue
        m = re.match(r'(\d+)\s+continue$', s)
        if m:
            labels.append(m.group(1))
        stmts.append(s)

    aliased = {a for a, _ in alias}

    def simple(s):
        s = s.strip()
        m = re.match(r'go\s*to\s+(\d+)$', s)
        if m:
            return 'break L%s;' % m.group(1)
        if s == 'return':
            return 'break RET;'
        m = re.match(r'call\s+sse_star\s*\((.*)\)$', s)
        if m:
            a = [x.strip() for x in m.group(1).split(',')]
            assert a[3:] == ['tm', 'tn', 'tscls', 'lums', 'gb', 'zpars'], a
            assigned.extend(['tm', 'tn'])
            return '{ const o_ = sse_star(%s, %s, %s, tscls, lums, gb, zpars); tm = o_[0]; tn = o_[1]; }' % tuple(
                expr(x, arrays) for x in a[:3])
        m = re.match(r'call\s+mrenv\s*\((.*)\)$', s)
        if m:
            a = [expr(x.strip(), arrays) for x in m.group(1).split(',')]
            return '{ const o_ = mrenv(%s); menv = o_[0]; renv = o_[1]; k2 = o_[2]; }' % ', '.join(a[:15])
        m = re.match(r'call\s+assign_remnant\s*\(', s)
        if m:
            return ('{ const o_ = hooks.assignRemnant({zpars, mc, mcbagb, mass, mt, kw, lum, r, '
                    'mcHe: mc_he[kidx], mcCO: mc_co[kidx]}); mass = o_.mass; mt = o_.mt; kw = o_.kw; mc = o_.mc; }')
        m = re.match(r'call\s+hrdiag_remnant\s*\(', s)
        if m:
            return ('{ const o_ = hooks.hrdiagRemnant({zpars, mt, mc, lum, r, aj, kw}); '
                    'mt = o_.mt; mc = o_.mc; lum = o_.lum; r = o_.r; aj = o_.aj; kw = o_.kw; }')
        m = re.match(r'([a-z_][a-z0-9_]*(?:\([a-z0-9_]+\))?)\s*=(?!=)(.*)$', s)
        if not m:
            raise ValueError('cannot translate: %r in %s' % (s, name))
        lhs = m.group(1)
        base = re.match(r'[a-z_][a-z0-9_]*', lhs).group(0)
        if '(' not in lhs:
            assigned.append(base)
        return '%s = %s;' % (expr(lhs, arrays), expr(m.group(2), arrays))

    for s in stmts:
        m = re.match(r'(\d+)\s+continue$', s)
        if m:
            lines.append('} // label %s' % m.group(1))
            continue
        m = re.match(r'(else\s*if|if)\s*\(', s)
        if m:
            j = match_paren(s, m.end() - 1)
            cond = expr(s[m.end():j], arrays)
            rest = s[j + 1:].strip()
            if rest == 'then':
                lines.append(('} else if (%s) {' if m.group(1).startswith('else') else 'if (%s) {') % cond)
            else:
                lines.append('if (%s) { %s }' % (cond, simple(rest)))
            continue
        if s == 'else':
            lines.append('} else {')
            continue
        if s in ('endif', 'end if'):
            lines.append('}')
            continue
        lines.append(simple(s))

    out = []
    is_func = unit['kind'] == 'function'
    arr_args = [a for a in args if a in arrays or a in ('tscls', 'lums', 'gb', 'zpars')]
    if name in STATE:
        out.append('export function %s(S) {' % name)
        scal = [a for a in args if a not in arr_args]
        out.append('  let ' + ', '.join('%s = S.%s' % (a, a) for a in scal) + ';')
        out.append('  const ' + ', '.join('%s = S.%s' % (a, a) for a in arr_args) + ';')
        extra = sorted(set(assigned) - set(scal))
        if extra:
            out.append('  let ' + ', '.join(extra) + ';')
        wb = scal + extra
    else:
        rets = RET.get(name, [])
        jsargs = [a for a in args if a not in rets]
        out.append('export function %s(%s) {' % (name, ', '.join(jsargs)))
        loc = sorted(set(assigned) - set(jsargs))
        if loc:
            out.append('  let ' + ', '.join(loc) + ';')
    for a, g in alias:
        out.append('  const %s = %s;' % (a, g))
    for nm, dim in local_arr:
        if nm in args or nm in aliased or nm in GLOBAL_ARRAYS:
            continue
        if nm in datas:
            out.append('  const %s = [0, %s];' % (nm, ', '.join(expr(v, []) for v in datas[nm])))
        else:
            out.append('  const %s = new Float64Array(%d);' % (nm, dim + 1))
    out.append('  RET: {' + ''.join(' L%s: {' % l for l in reversed(labels)))
    ind = 2
    for l in lines:
        if l.startswith('}'):
            ind -= 1
        out.append('  ' * ind + l)
        if l.endswith('{'):
            ind += 1
    out.append('  }')
    if name in STATE:
        out.append('  ' + ' '.join('S.%s = %s;' % (a, a) for a in wb))
        out.append('  return S;')
    elif is_func:
        out.append('  return %s;' % name)
    else:
        out.append('  return [%s];' % ', '.join(RET[name]))
    out.append('}')
    return '\n'.join(out)


def main():
    datas = {}
    # zdata.h: data statements for the coefficient tables
    for s in read_statements(os.path.join(SRC, 'zdata.h')):
        m = re.match(r'data\s+(\w+)\s*/(.*)/$', s)
        if m:
            datas[m.group(1)] = [x.strip() for x in m.group(2).split(',')]
    js = ['// GENERATED FILE - do not edit by hand. Produced by tools/f2js.py from the',
          '// SSE Fortran sources (Hurley, Pols & Tout 2000, MNRAS 315, 543) as distributed',
          '// with COSMIC. All arrays are 1-indexed like the Fortran (element 0 unused).',
          '/* eslint-disable */',
          'export const hooks = { assignRemnant: null, hrdiagRemnant: null };',
          'export const flags = { wdflag: 1 };',
          'const zsun = 0.02, st_tide = 0;',
          'let wdflag = 1;',
          'export function setFlags(f) { Object.assign(flags, f); wdflag = flags.wdflag; }',
          'const MSCFF = new Float64Array(201), GBCFF = new Float64Array(201);',
          'export const mc_he = [0, 0, 0], mc_co = [0, 0, 0];',
          '// rtmsflag = 0: the plain SSE terminal-main-sequence radius.',
          '// HAND-WRITTEN GUARD (not part of SSE): the R_TMS fit is only valid to 100 Msun and its',
          '// polynomial turns over and even goes negative when extrapolated at low Z. Above 100 Msun',
          '// we continue it as a power law with the logarithmic slope it has between 90 and 100 Msun.',
          'export function rtmsf(m, met) {',
          '  if (m <= 100) return rtmssse(m);',
          '  const r100 = rtmssse(100), beta = Math.log(r100 / rtmssse(90)) / Math.log(100 / 90);',
          '  return r100 * (m / 100) ** beta;',
          '}']
    for k in ['xz', 'xt', 'xl', 'xr', 'xg', 'xh']:
        vals = [expr(v, []) for v in datas[k]]
        js.append('const %s = [0,\n  %s];' % (k, ', '.join(vals)))
        js.append('export const n_%s = %d;' % (k, len(vals)))
    done = set()
    for f in ['SSE/SSE_zfuncs.f', 'SSE/SSE_zcnsts.f', 'SSE/SSE_star.f', 'SSE/SSE_hrdiag.f', 'mrenv.f']:
        for u in split_units(read_statements(os.path.join(SRC, f))):
            if u['name'] in KEEP:
                js.append(convert(u, datas))
                done.add(u['name'])
    missing = KEEP - done
    assert not missing, missing
    open(OUT, 'w').write('\n\n'.join(js) + '\n')
    print('wrote', OUT, 'units:', len(done))


main()
