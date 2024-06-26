class Node {
  constructor(key, value, next = null, prev = null) {
    this.key = key;
    this.value = value;
    this.next = next;
    this.prev = prev;
  }
}

/**
 * LRU(Least Recent Used)
 * 1. 模拟使用链表方式，不断在头部添加key-value元素，当达到limit后，最后面的pop
 * 2. 使用cache，快速read
 * 3. NOTICE：读的时候需要注意，首先删除这个node，然后添加到头部，因为他现在是最新的了
 * limit，size，head，tail，cache
 */
class LRU {
  //set default limit of 10 if limit is not passed.
  constructor(limit = 10) {
    this.size = 0;
    this.limit = limit;
    this.head = null;
    this.tail = null;
    this.cache = {};
  }

  // Write Node to head of LinkedList
  // update cache with Node key and Node reference
  write(key, value){
    this.ensureLimit();

    if(!this.head){
      this.head = this.tail = new Node(key, value);
    }else{
      const node = new Node(key, value, this.head);
      this.head.prev = node;
      this.head = node;
    }

    //Update the cache map
    this.cache[key] = this.head;
    this.size++;
  }

  // Read from cache map and make that node as new Head of LinkedList
  read(key){
    if(this.cache[key]){
      const value = this.cache[key].value;
      
      // node removed from it's position and cache
      this.remove(key)
      // write node again to the head of LinkedList to make it most recently used
      this.write(key, value);

      return value;
    }

    console.log(`Item not available in cache for key ${key}`);
  }

  ensureLimit(){
    if(this.size === this.limit){
      this.remove(this.tail.key)
    }
  }

  remove(key){
    const node = this.cache[key];

    if(node.prev !== null){
      node.prev.next = node.next;
    }else{
      this.head = node.next;
    }

    if(node.next !== null){
      node.next.prev = node.prev;
    }else{
      this.tail = node.prev
    }

    delete this.cache[key];
    this.size--;
  }

  clear() {
    this.head = null;
    this.tail = null;
    this.size = 0;
    this.cache = {};
  }

  // Invokes the callback function with every node of the chain and the index of the node.
  forEach(fn) {
    let node = this.head;
    let counter = 0;
    while (node) {
      fn(node, counter);
      node = node.next;
      counter++;
    }
  }

  // To iterate over LRU with a 'for...of' loop
  *[Symbol.iterator]() {
    let node = this.head;
    while (node) {
      yield node;
      node = node.next;
    }
  }
}