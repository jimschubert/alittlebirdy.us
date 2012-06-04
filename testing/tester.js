var http = require('http'),
    Tweeter = require('tweeter.js');

var tweeter = new Tweeter({ 
    consumerKey : 'GDdmIQH6jhtmLUypg82g',
    tokenSecret: 'J6zix3FfA9LofH0awS24M3HcBYXO5nI1iYe8EfBA',
    accessToken: '819797-Jxq8aYUDRmykzVKrgoLhXSq67TEa5ruc4GJC2rWimw',
    consumerSecret: 'MCD8BKwGdgPHvAuvgvz4EQpqDAtx89grbuNMRd7Eh98'
});

tweeter.update_status({ status: 'setting%20up%20my%20twitter%20私のさえずりを設定する'})
    .on('data', process.stdout.write);
