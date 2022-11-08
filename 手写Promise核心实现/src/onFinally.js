Promise.reject(100).finally(()=>{
	console.log('哈哈哈啊')
	// return 200;
	// throw new Error('错误');
	return new Promise((resolve,reject)=>{
		setTimeout(()=>{
			reject(200);
		},1000)
	})
}).then((res)=>{
	console.log('res',res);
}).catch(err=>{
	console.log('err',err);
})

/* 
	finally的回调中，如果函数return了一个普通值，那么会忽略
	如果手动throw了一个错误，那么会透传并被下一个PROMSIE的错误回调
	所接受
	
	如果return了一个新的promise，会等待这个promsie的状态发生变化
	如果成功，那么会获取最开始.finally的那个实例的成功的值，当前这个promise的值发生变化并没有任何效果
	
	如果失败，那么错误会传递到下一个promsie then的错误回调中去
 */