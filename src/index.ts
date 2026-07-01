import { startCLI } from './chat/cli.js'

startCLI().catch((error: Error) => {
  console.error(error.message)
  process.exit(1)
})
