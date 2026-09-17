"""Optional local IPC-2581 XSD validation; does not fetch or upload any files.
Usage: python3 scripts/validate-ipc2581.py board.xml IPC-2581C.xsd
Requires xmllint (libxml2). Obtain the schema separately from IPC or KiCad's
qa/data/pcbnew/ipc2581/IPC-2581C.xsd. Schema validation is not fabrication approval.
"""
import subprocess
import sys
from pathlib import Path
if len(sys.argv) != 3:
    raise SystemExit(__doc__)
xml, schema = (Path(p).resolve(strict=True) for p in sys.argv[1:])
raise SystemExit(subprocess.run(['xmllint', '--nonet', '--noout', '--schema', str(schema), str(xml)]).returncode)
