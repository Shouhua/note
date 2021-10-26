/**
 * 输入：twoSum([2, 7, 11, 15], 9) 
 * 输出：[0,1]
 */
function twoSum(arr, sum) {
  if(!Array.isArray(arr)) return
  arr.forEach((item, index) => {
    let buf = sum - item
    const buffArr = arr.slice(index + 1)
    let i = buffArr.findIndex(item => item === buf)
    if(i !== -1) {
      console.log(`[${index}, ${i + index + 1}]`)
    } 
  })
}
twoSum([2, 7, 11, 15], 9)