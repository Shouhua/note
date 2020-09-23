const wait = (n: number) => new Promise(r => setTimeout(r, n))

async function greet() {
  await wait(1000)
  return {
    label: 'hello, world!'
  }
}

console.log(typeof greet())