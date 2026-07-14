declare module "pdfmake/build/pdfmake" {
  export * from "pdfmake";
  export { default } from "pdfmake";
}

declare module "pdfmake/build/vfs_fonts" {
  import type { TVirtualFileSystem } from "pdfmake/interfaces";

  const vfs: TVirtualFileSystem;
  export default vfs;
}
