var http = require('http');
var url = require('url');
var querystring = require('querystring');
var mysql = require('mysql');
var geolib = require('geolib');

var port = process.argv[2] || "9090"

var httpServer = http.createServer(onRequest)
httpServer.listen(Number(port), undefined, 4000)

var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'victor',
    password : 'fnemo',
    database: 'fishbase',
});
connection.connect();

function onRequest (req, res) {
    var pathname = url.parse(req.url).pathname
    var query = url.parse(req.url).query;
    var body = ''

    req.on('data', function (chunk) {
        body += chunk
    })

    req.on('end', function () {
        var params = querystring.parse(query);
        route(res, pathname, params);
    })
}

function sendResponse (res, statusCode, content) {
    res.writeHead(statusCode, {'Content-Type': 'text/html'})
    res.write(content)
    res.end()
}

function sendQueryRes (res, content) {
    res.writeHead(200, {'Content-Type': 'application/json'})
    res.write(content)
    res.end()
}

function sendQuery (res, lat, lon) {
    
    var sQuery = "select fp.ImageUrl, af.Name, ll.Species, ll.Family, fp.Class, fp.FishOrder, ll.Latitude, ll.Longitude, af.Habitat, af.Length_cm, af.Trophic_Level from latlon ll, allfish af, fishpic fp where ll.Latitude = "+lat+" and ll.Longitude = "+lon+" and ll.Family = fp.Family and af.Species = fp.Species;";
    console.log(sQuery);
    var query = connection.query(sQuery, function(err, rows, fields) {
        if (err) { 
            throw err;
        } else {
            sendQueryRes(res, JSON.stringify(rows));
        }
    });
}

function handleQuery (res, params) {
    var sQuery = 'select Latitude,Longitude from latlon;';
    var query = connection.query(sQuery, function(err, rows, fields) {
        if (err) { 
            throw err;
        } else {
            var minDist = -1;
            var lat = 0;
            var lon = 0;
            for (var i in rows) {
                var dist = geolib.getDistance({latitude: parseFloat(rows[i].Latitude), longitude: parseFloat(rows[i].Longitude)},
                    {latitude: params.lat, longitude: params.lon});
                if (minDist == -1 || dist < minDist) {
                    minDist = dist;
                    lat = rows[i].Latitude;
                    lon = rows[i].Longitude;
                    console.log('min distance: '+minDist+' m ('+lat+','+lon+')');

                }
            }
            sendQuery(res, lat, lon);
        }
    });
}

function route (res, pathname, params) {
    console.log('someone requested '+pathname+' with params:'+JSON.stringify(params));
    switch (pathname) {
    case '/query':
        handleQuery(res, params)
        break
    default:
        sendResponse(res, 404, 'Unrecognized request' + pathname)
        break
    }
}
