// The shapes of the data the server and the website send each other.
//
// Both sides import from here (`import type { ... } from '@shiurfinder/shared'`),
// so if one side changes a shape, the other side's code stops compiling.
// You find out right away instead of the map silently breaking.
//
// Each feature has its own file. Adding a feature: create shared/<feature>.ts
// and add one line here. Only types go in these files, no code that runs.

export * from './common';
export * from './map';
export * from './shiur-page';
export * from './publishers';
export * from './portal';
export * from './account';
