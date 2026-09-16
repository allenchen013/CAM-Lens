# CAM Lens

**A local-first CAM350 ASCII PCB viewer and Gerber X2 exporter.**

English | [繁體中文](README.zh-TW.md)

Open a legacy CAM350 text database, inspect its layers and drill sizes, and export individual layers as Gerber X2. CAM Lens runs entirely in your browser with no runtime dependencies, accounts, uploads or build step.

## Quick start

1. Download or clone this repository.
2. Open **`dist/index.html`** in a current desktop browser, or open the included **`CAM-Lens.html`** standalone edition.
3. Select **Open file** or drag a CAM350 ASCII `.pcb`, `.cam` or text-format backup onto the page.
4. Use the **繁體中文 / English** selector to change the interface language.

The initial board is a synthetic demonstration, not a uploaded or real customer design. A `.pcb` extension alone does not identify CAM350 format: KiCad, other PCB formats, binary CAM350 databases and Gerber files are not supported inputs.

If you prefer a local server, run from the project folder:

```sh
python3 -m http.server 8765 --bind 127.0.0.1 --directory dist
```

Then open [localhost:8765](http://127.0.0.1:8765). No npm installation is needed.

## Features

- Traditional Chinese and English interfaces, including errors, tooltips, accessibility labels and export settings. The selected language is remembered on this browser.
- Per-layer visibility, solo view, and copper/drill presets.
- Drag to pan, wheel or pinch to zoom, **F** to fit the drawing.
- Point-to-point measurements in millimetres.
- Drill table, diameter highlighting, and hole inspection with coordinates.
- Separate drawing diameters and NC tool diameters, preserving source compensation.
- Gerber X2 export for all or selected layers, with editable layer roles, polarity and copper layer count.
- Separate Excellon / XNC exports for plated and non-plated hits.
- ZIP download with a file manifest and conversion notes.
- Optional WebMCP tools for language, layer visibility, board summaries and the export dialog. File download remains a user action.

Language changes preserve the loaded board, pan/zoom, measurements, selected holes and export choices. Chinese mode retains English layer terminology; English mode uses English descriptions. Original file names, layer names and board text are not translated.

## Export Gerber

1. Open a supported CAM350 ASCII file and select **Export Gerber**.
2. Choose layers, confirm the **copper layer count**, and review each layer's **function** and **polarity**.
3. Choose whether to include NC drill files and embedded-font text.
4. Select **Download Gerber ZIP**.

Every `.gbr` is **Gerber X2**, using millimetres and absolute signed 4.6 coordinates. It includes `.FileFunction`, `.FilePolarity`, `.SameCoordinates`, `.CreationDate` and `.GenerationSoftware` attributes. All layers share the source origin and orientation; they are not scaled or mirrored.

Default role suggestions:

| Source layer | Suggested role | X2 file function |
| --- | --- | --- |
| `COMP` | Top Copper | `Copper,L1,Top` |
| `SOLD` | Bottom Copper | `Copper,L<n>,Bot` |
| `CMSK` / `SMSK` | Top / Bottom Soldermask | `Soldermask,Top` / `Soldermask,Bot` |
| `CILK` / `SILK` | Top / Bottom Legend | `Legend,Top` / `Legend,Bot` |
| NC drill layer | Drill map | `Drillmap` |
| Other layers | Drawing or reference layer | `Drillmap`, `FabricationDrawing` or `OtherDrawing` |

`n` is the configured copper layer count (default **2**, allowed **2–64**). Inner copper roles can be assigned explicitly. Soldermask defaults to **Negative**, meaning the image depicts openings. This attribute describes the image's meaning; it does not invert the geometry.

Drawing diameters and actual tool diameters can differ. For example, a **0.9 mm drawing hole / 1.0 mm NC tool** stays exactly that way after export. The `.drl` files use NC tool diameters with explicit metric decimal coordinates. A `drill_map.gbr` is a reference drawing and does not replace the Excellon drilling file.

## Supported formats and limits

Verified with **CAM350 6.0 ASCII** databases. The parser understands the following subset:

| Data | Coverage |
| --- | --- |
| Lines and polylines | Basic round-aperture strokes; filled polygons |
| Pads | Round, square, rectangle, oblong and donut apertures |
| Circles | Basic outlines and filled circles |
| Drills | NC `HIT` locations and tool tables |
| Text | Supported `TEXT2` styles with embedded TrueType outlines |

Coordinates use CAM350's 0.002 µm database unit (500,000 units/mm). Aperture references are table indices, distinct from D-codes. NC paths resolve tool IDs through each layer's assigned tool table.

**This is a partial converter, not a complete CAM350 implementation or a guaranteed fabrication package.**

- Unsupported custom apertures, clear/negative geometry, routing, transforms, pad stacks, component instances and step-and-repeat can produce warnings and block export.
- Text curves are approximated within a 0.001 mm flattening tolerance. Check reconstructed text appearance. Unsupported text can be explicitly excluded, and the omission is recorded in the manifest.
- No standalone **Profile** / board-outline file is synthesized. Verify and supply a board profile before fabrication.
- Net, component, pin and tolerance attributes are not invented when source information is unavailable.
- Input limit: 30 MB and 350,000 graphic entities. Large exports may require selecting fewer layers.
- Other CAM350 versions and binary databases are not guaranteed to work.

## Privacy

The application reads selected files into browser memory. It does not upload board data, write to the original files, send analytics, or make application network requests. Hosting may make normal requests to load the page assets. Only the interface language is saved in local storage; storage failures do not prevent use. Reloading the page clears the loaded board.

The public source contains a synthetic demo and synthetic test fixtures. It excludes private PCB files, exported manufacturing data, hosting configuration, credentials and private repository history. Embedded fonts are read from your own file; no commercial font binaries are bundled.

## Development and tests

The source is plain HTML, CSS and JavaScript. Node.js **20 or later** is sufficient for the dependency-free test and packaging scripts; Node is not needed to use the viewer.

```sh
node --test parser.test.cjs exporter.test.cjs i18n.test.cjs
node scripts/build-standalone.cjs
```

The second command regenerates `CAM-Lens.html` from the exact `dist` assets. An optional output path may be supplied as its final argument.

Tests cover aperture indexing, tool lookup, signed coordinates, X2 metadata and polarity, compensated drill diameters, text exclusion, unsupported input, PTH/NPTH separation, and translation coverage. Optional real-file regressions in the parser and exporter suites require a private reference file; it is not part of the public repository.

Independent verification has also loaded generated Gerber/XNC files with Gerbonara, compared source coordinates and aperture dimensions, inspected rendered text, and validated ZIP checksums. This does not constitute certification for every CAM350 file.

```text
 dist/
   index.html       Page and accessible controls
   style.css        Responsive viewer styles
   i18n.js          Chinese/English catalog and language preferences
   parser.js        CAM350 ASCII parser
   exporter.js      Gerber X2, XNC and ZIP writer
   app.js           Canvas viewer and interactions
 scripts/
   build-standalone.cjs    Produce the offline HTML edition
   prepare-open-source.cjs  Copy an explicit public-file allowlist
 *.test.cjs          Dependency-free regression tests
 LICENSE            MIT license
```

To prepare a fresh public source folder from a development checkout:

```sh
node scripts/prepare-open-source.cjs ../cam-lens-public
```

The target must not already exist. The script copies only explicitly listed source, documentation and tests, then builds the offline HTML. It does not copy `.git`, `.openai`, board data or exported Gerbers.

## Publishing on GitHub

Create a public repository such as `cam-lens`, then upload the **extracted project contents**, keeping the `dist` and `scripts` folders intact. Include this README, the Chinese README and `LICENSE`. Do not upload a source ZIP as the only repository file.

For command-line publishing, follow GitHub's [guide to adding locally hosted code](https://docs.github.com/en/migrations/importing-source-code/using-the-command-line-to-import-source-code/adding-locally-hosted-code-to-github). For an existing local Git repository, create the GitHub repository without initializing another README or license to avoid conflicting histories. The public package requires no hosted service configuration.

## Contributing

Bug reports and focused pull requests are welcome. Include the application language, browser, expected behavior and a minimal **synthetic or shareable** CAM350 example. Do not attach confidential board files. Parser/exporter changes should include a meaningful geometry or error-handling test; new interface copy belongs in both language entries in `dist/i18n.js`. Run the tests and regenerate the standalone file before submitting changes.

## License and references

[MIT License](LICENSE). You may use, modify and redistribute the software under its terms.

- [Ucamco Gerber Layer Format specification](https://www.ucamco.com/files/downloads/file_en/456/gerber-layer-format-specification-revision-2024-05_en.pdf)
- [Ucamco XNC Format specification](https://www.ucamco.com/files/downloads/file_en/452/xnc-format-specification-revision-2021-11_en.pdf)
