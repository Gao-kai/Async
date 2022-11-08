1. 执行new MyPromise(initExecutor);
2. initExecutor传入MyPromise的构造器函数开始执行，开辟一个作用域空间z1
3. 此时构造器函数内部的this必须是实例p对象，给p对象赋值，然后定义resolve和reject函数
4. 执行到try executor(resolve, reject)这一句，才真正的开始执行用户传入的executor函数

1. 开辟新的一个函数作用域z2，开始执行executor函数，executor是个箭头函数，依次执行
2. 发现内部的第一句代码是执行resolve函数,resolve在自己executor作用域有吗？有个鸡儿
3. 那怎么办 找向上找啊 上一级的MyPromise的构造器函数中有一个定义的resolve函数 找到执行，并将参数传递进去
4. 但是这时候的参数又是一个new MyPromise(xxx),那又来把 继续执行，我等着你的返回值x

1. 执行new MyPromise((resolve, reject) => {resolve(100);})
2. 执行函数就需要作用域，开辟一个新的作用域z3
3. MyPromise的构造函数开始执行，此时构造器函数内部的this是指向现在这个new MyPromise 100的实例x的，外界没有接受
4. 给x对象赋值，又定义了resolve和reject函数
5. 执行到try-catch的时候，才开始真正的执行传入的(resolve, reject) => {resolve(100);}这一句
6. 继续执行，发现函数体内同步执行了resolve(100)，好了，现在要执行这个resolve

1. 开辟一个新的函数作用域z4，执行resolve函数
2. 发现resolve中当前x的状态是pending，将x的value设置为100，x的状态设置为fulfilled
3. 然后检查onFulfilledCbList列表中是否有值，有的话取出执行，但是这里没有，那么resolve函数执行完成
4. 执行这个resolve（100）的作用就ok了，就是将x的value = 100，将x的状态修改为成功fulfilled
5. resolve函数执行完成，弹出栈顶，z4销毁

1. 指针指向z3，(resolve, reject) => {resolve(100);}
2. z3也执行完毕，new MyPromise的结果就是隐式的返回一个状态为成功，value为100的promsie实例x
3. z3宣布执行完毕，退出栈
4. 执行指向z2，此时z2中已经确定要resolve的x是一个promsie实例 状态为成功，value为100
5. 此时就等价于reoslve(x)，但是resolve是z1空间中定义的resolve函数，开始执行

1. 开辟一个新的作用域z5，开始执行resolve(x)
2. 进入resolve函数，发现x instanceof MyPromise符合，执行条件语句
3. let y = value.then(resolve, reject);
4. 又要执行then方法了，此时value是x，值100状态成功，传入的resolve是z1中的，reject也是z1中的

+++++++++++ 开始执行x.then(resolve,reject)

1. 开辟一个新的作用域z6，开始执行then方法
2. 执行then方法首先进去就是判断回调是否是函数，这里通过
3. 接着迎面就是一个let promise2 = new MyPromise()

1. 执行let promise2 = new MyPromise() 开辟一个新的作用域z7执行构造器函数
2. 首先和上面一样，是给实例promise2的状态进行赋值初始化，定义z7中的resolve和reject函数
3. 然后到try-catch开始执行真正的它这给你定义好的executor，自己new的时候executor自己控制resolve何时执行，这里then的时候new是它内部给你定义好了什么情况下走resolve和reject

1. 开辟一个新的作用域z8，执行这个定义好的executor
2. executor里面的this可不是constructor中this，这个一定明白。executor里面的this由于在箭头函数中，和上一级是一样的也就是调用then方法的那个对象，在这里也就是value也即是x；而constructor里面的this一定是实例的，也就是promise2
3. 读取value也就是x的状态为成功，走进if (this.status === this.FULFILLED) 
4. 执行let x = onFulfilled(this.value);


1. 开辟一个新的作用域z9,this是x 它的值value是100
2. 等于执行onFulfilled就是z1中的resolve函数，执行let x = resolve(100);
3. 执行z1中的resolve方法，执行完成将外部大boss p实例的值变为100，状态变为成功，返回一个寂寞undefined
4. z9执行完毕弹出，回到z8中，此时x的值就是undefined
5. 在z8中执行resolvePromise(promise2, x, resolve, reject),这个resolve是z7中的

1. 开辟一个新的空间z10，执行resolvePromise
2. 执行的结果是执行z7中的resolve(undefiend)

1. 开辟一个新的空间z11，执行resolve(undefiend)
2. z7中的constructor中的this是promise2，将其值修改为undefiend，状态变为成功
3. z11执行resolve完毕弹出
4. z10执行resolvePromise完毕弹出
5. z8执行定义好的executor完毕弹出
6. z7执行promsie2的构造器函数成功弹出，将promsie2构造好了 成了一个值为undefiend 状态为成功的实例并返回了
7. z6中执行x.then的结果就是返回那个promsie2实例
8. 进入到z5中，并没有接收这个z6返回的promsie2实例
9. z2执行完毕，销毁
10. z1销毁，宣布大bossp的值为100，状态为成功

1. 外部调用p.then
2. 调用then，就会首先执行一次MyPromise的构造器函数，此时this是外部的那个promsie2
3. 然后执行executor，此时的this是p
4. 读取p的状态为成功，决定了走执行成功回调(res) => {console.log(res);}
5. 读取p的值为100，决定了传入到成功回调中的参数值100
6. 读取执行成功回调返回的结果，这里打印了100之后返回值为undefiend
7. 进入resolvePromise
8. resolve一个undefiend，这个resolve就是最新new的时候在构造器中定义的那个resolve 最新的
9. 执行resolve，进入构造器，改变实例状态为成功，改变值为undefiend，也就是即将返回到外面让别人接着then的那个promsie2的值就是undefiend，如果你执行成功回调的时候值是200，那么promsie2实例的值就是200
10. 后续你接着then，又会执行上面这一套，

执行p.then:

1. 先画饼，执行构造器，此时this是即将构造养成的下一个返回到外部的promise实例，将它的value和状态变为空
2. 然后执行executor，此时this是外面.的上一个promsie实例p
3. 读取p的状态，决定走那个条件语句执行什么回调
4. 读取p的值，决定要传入的参数是value还是reason以及值是多少
5. 执行then方法的失败或者成功回调，获取返回值x，这一步往往就会打印res/error
6. 将x 传入resolvePromsie中进行解析，如果x是普通值，直接将返回值resolve(x)
7. 这个resolve就是最新的这个构造器中的resolve方法，终于等到你，开始执行
8. 读取新的promise实例的状态为pending，接着进行改造
9. 将新的promise实例的状态先改造为成功，便于在下一次then的时候重复第三步进行读取
10. 将新的promise实例的值改造为返回值x，便于在下一次then的时候重复第四步进行读取
11. 新的promsie实例new完成了，将其隐式返回，从第一步的value和状态为空，到现在有值
12. 新的promsie实例.then...，重复执行上诉流程

如果第6步中的x又是一个promsie实例，其状态的值是由其内部的resolve或者reject执行后才知道的
那么首先我们要等待它状态和值发生变化，拿到一个值和状态都稳定的promsie
对这个稳定的promsie进行解析
解析的过程就是：取出这个稳定的promsie的then方法并执行，执行的过程中将then方法内部的this改变为这个稳定的promsie，问题就转化成为了稳定的promsie.then的老套路
执行上诉10步，此时的p就是稳定的promsie，成功回调就是 (y) => {resolvePromise(promise2, y, resolve, reject);}，假设稳定的promsie的状态为成功，值为200，执行成功回调并将200传递给y
执行的过程是递归执行resolvePromise，结果就是resolve(200)
其实我发现了resolvePromise的作用最后最后就是将要返回出去的那个promsie的值还有状态进行修改，便于后续的then
这里将要返回到外部的那个promsie状态变为成功，值变为200




```js
function run(cb){
	 function log(value){
		 console.log(value);
	 }
	 
	 cb();
}

let log100 = function(){
	log(100);
}

run(log100);

```