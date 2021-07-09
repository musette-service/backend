import ignore from 'rollup-plugin-ignore'
import { nodeResolve } from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import json from '@rollup/plugin-json'

export default {
  input: 'src/server.js',
  output: {
    file: 'build/musette.js',
    format: 'cjs',
    strict: false,
    banner: '#! /usr/bin/env node\n',
  },
  plugins: [ignore(['react-native-fs']), nodeResolve({
    preferBuiltins: true,
  }), json(), commonjs({ignoreDynamicRequires: true})]
};
