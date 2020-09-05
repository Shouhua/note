interface Job {
  (): void
  id?: number
  allowRecursive: boolean
}

const job1: Job = function() {
  console.log('just a job')
}
job1.allowRecursive = !!job1