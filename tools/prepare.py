#!/usr/bin/env python3
"""Stage the pinned PlasmaTerm snapshot with non-destructive PocketPlasma overlays."""
import argparse
import json
import shutil
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
UPSTREAM=ROOT/'vendor'/'plasmaterm'
REQUIRED=('LICENSE','plasma.py','plasma_config_gen.py','web/index.html',
          'web/plasma-browser.js','web/plasma-worker.js','web/plasma-lut-editor.mjs')
PIN='dfad2ddbdaa62438194a771ad4086ed1c2cfbff0'

def stage(dest):
    dest=Path(dest)
    if dest.resolve() in (ROOT.resolve(),ROOT.parent.resolve(),UPSTREAM.resolve()):
        raise ValueError('unsafe staging destination')
    for name in REQUIRED:
        if not (UPSTREAM/name).is_file():
            raise FileNotFoundError(UPSTREAM/name)
    if dest.exists():shutil.rmtree(dest)
    shutil.copytree(UPSTREAM,dest)
    pocket=ROOT/'web'/'pocket'
    target=dest/'web'/'pocket'
    target.mkdir(parents=True,exist_ok=True)
    for item in pocket.glob('*'):
        if item.suffix in ('.mjs','.css'):
            shutil.copyfile(item,target/item.name)

    for path,overlay in (('web/plasma-browser.js','runtime-hook.js'),
                         ('web/plasma-worker.js','worker-hook.js')):
        output=dest/path
        original=output.read_text(encoding='utf-8')
        if 'POCKETPLASMA_STAGE_V1' in original:
            raise ValueError('vendor unexpectedly contains prior stage marker')
        output.write_text(original+'\n/* POCKETPLASMA_STAGE_V1 */\n'+
                          (pocket/overlay).read_text(encoding='utf-8')+'\n',encoding='utf-8')

    output=dest/'plasma.py'
    output.write_text(output.read_text(encoding='utf-8')+'\n# POCKETPLASMA_STAGE_V1\n'+
                      (pocket/'python-hook.py').read_text(encoding='utf-8')+'\n',encoding='utf-8')

    html=dest/'web'/'index.html'
    page=html.read_text(encoding='utf-8')
    if page.count('</head>')!=1 or page.count('</body>')!=1 or 'pocket/controller.mjs' in page:
        raise ValueError('upstream HTML layout changed; staging needs review')
    page=page.replace('</head>','<link rel="stylesheet" href="./pocket/controller.css">\n</head>')
    page=page.replace('</body>','<script type="module" src="./pocket/controller.mjs"></script>\n</body>')
    html.write_text(page,encoding='utf-8')
    metadata={'schema':'pocketplasma-stage-v1','source':'techrote/PlasmaTerm','sha':PIN,
              'license':'AGPL-3.0','physical_tested':False}
    (dest/'POCKETPLASMA_PROVENANCE.json').write_text(json.dumps(metadata,indent=2)+'\n')
    return metadata

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,default=ROOT/'build'/'site')
    args=parser.parse_args()
    stage(args.output)
    print('Staged source-exact web renderer + PocketPlasma adapters in',args.output)
    print('Serve: python -m http.server 8000 --directory',args.output)
    print('Open http://localhost:8000/web/ in Chromium or launch ASCIIomium --url http://localhost:8000/web/')
