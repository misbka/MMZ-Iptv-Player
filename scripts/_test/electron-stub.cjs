/* Stub do módulo 'electron' para testar os serviços em Node puro. */
module.exports = {
  app: {
    getPath: () => require('path').join(process.cwd(), '.tmp-test-userdata'),
    getVersion: () => '1.0.0-test'
  }
}
