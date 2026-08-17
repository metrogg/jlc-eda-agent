import fs from 'node:fs';
import path from 'node:path';
import { Resvg } from '@resvg/resvg-js';

const svgPath: string = path.join(__dirname, '../images/logo.svg');
const pngPath: string = path.join(__dirname, '../images/logo.png');

const svgBuffer: Buffer = fs.readFileSync(svgPath);
const resvg: Resvg = new Resvg(svgBuffer, {
	fitTo: { mode: 'width', value: 1024 },
	background: 'transparent',
});
const rendered = resvg.render();
const pngData: Buffer = rendered.asPng();

fs.writeFileSync(pngPath, pngData);
console.log(`Logo converted: ${pngPath}`);
