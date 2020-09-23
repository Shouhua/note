import { ref } from 'vue'

declare global {
  interface Window {
    init: () => void
  }
}

interface Job {
  (): void
  id?: number | string
  allowRecursive: boolean
}

const job1: Job = function() {
  console.log('just a job')
}
job1.allowRecursive = !!job1

window.init = () => {}