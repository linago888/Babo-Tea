/**
 * Inline 在 <head> 最前面執行：讀 cookie + 套 .dark class
 * 必須在 React hydrate 前跑，否則會 flash white → dark
 *
 * 註：此 script 由 server component 注入，runtime 在 client，
 *     必須是 synchronous、不依賴任何 imports
 */
export function ThemeScript() {
  const code = `
(function() {
  try {
    var m = document.cookie.match(/(?:^|; )theme=([^;]+)/);
    var v = m ? decodeURIComponent(m[1]) : 'system';
    var dark = v === 'dark' || (v !== 'light' && window.matchMedia('(prefers-color-scheme: dark)').matches);
    document.documentElement.classList.toggle('dark', dark);
    document.documentElement.style.colorScheme = dark ? 'dark' : 'light';
  } catch (e) {}
})();
`;
  return <script dangerouslySetInnerHTML={{ __html: code }} />;
}
