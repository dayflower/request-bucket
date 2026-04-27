declare module '*.css' {}

declare module '*.html' {
  const html: import('bun').HTMLBundle;
  export default html;
}

declare namespace NodeJS {
  interface ProcessEnv {
    BUN_PUBLIC_APP_VERSION?: string;
    BUN_PUBLIC_GIT_COMMIT?: string;
  }
}
