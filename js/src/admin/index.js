import app from 'flarum/admin/app';

export { default as extend } from './extend';

app.initializers.add('peopleinside-restricted-visibility', () => {
  // Registered for Flarum 2.0 extension registry
});
