import { create } from 'twrnc';

// Load tailwind configuration with Best Cream brand colors
// eslint-disable-next-line @typescript-eslint/no-var-requires
const tailwindConfig = require('../../tailwind.config.js');

export const tw = create(tailwindConfig);
export default tw;

