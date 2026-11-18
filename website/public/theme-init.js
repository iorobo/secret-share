(function () {
  try {
    var DEFAULT_LIGHT = 'emerald';
    var DEFAULT_DARK = 'dim';
    var storedMode = localStorage.getItem('themeMode'); // 'light' | 'dark'
    var mode =
      storedMode === 'light' || storedMode === 'dark' ? storedMode : 'light';
    document.documentElement.setAttribute(
      'data-theme',
      mode === 'dark' ? DEFAULT_DARK : DEFAULT_LIGHT,
    );
  } catch (e) {
    document.documentElement.setAttribute('data-theme', 'emerald');
  }
})();
