if('serviceWorker' in navigator) {
  navigator.serviceWorker.register('serviceworker.js', {
    scope: './'
  }).then(function(registration) {
    let serviceWorker
    if(registration.installing) {
      serviceWorker = registration.installing
      document.querySelector('#kind').textContent = 'installing'
    } else if(registration.waiting) {
      serviceWorker = registration.waiting
      document.querySelector('#kind').textContent = 'waiting'
    } else if(registration.active) {
      serviceWorker = registration.active
      document.querySelector('#kind').textContent = 'active'
    }
    if(serviceWorker) {
      serviceWorker.addEventListener('statechange', (e) =>{
        console.log(`[ServiceWorker]: ${e}`)
      })
    }
  })
} else {
  alert('service worker is not support')
}