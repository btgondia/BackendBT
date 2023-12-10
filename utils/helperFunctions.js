function getOrderStage(status=[]){
    let numbers=status.map((item)=>+item.stage).filter((item)=>item!==3.5)
    let max=Math.max(...numbers)
    console.log(max)
    return max
}

module.exports = {
    getOrderStage
}