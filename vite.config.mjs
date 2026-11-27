export default {
  base: './',
  build: {outDir:'docs',rollupOptions:{input:{demo:'index.html',guide:'guide.html'}}},
  server: {host:'127.0.0.1',port:5173,strictPort:true,proxy:{'/api':'http://127.0.0.1:4174'}}
};
