// Injection token for the active MapsProvider. In its own file so consumers
// (controllers) don't import the module and create a circular dependency.
export const MAPS_PROVIDER = 'MAPS_PROVIDER';
