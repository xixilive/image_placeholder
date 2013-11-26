var Canvas = require('canvas'), 
    Image = Canvas.Image,
    fs = require('fs'),
    path = require('path');

var HotImage = function(config){
  config = config || {}
  this.config = HotImage.defaultConfig;
  for(var k in config){
    if(config[k]){
      this.config[k] = config[k]
    }
  }
  this.loadThemes();
};

HotImage.defaultConfig = {
  cache: true,
  route_prefix: 'g',
  theme_root: __dirname + '/images/',
  named_colors: {
    red: '#FF0000',
    green: '#00FF00',
    blue: '#0000FF'
  },
  default_colors: ["#DDD", "#666"],
  max_size: 1200
};

HotImage.prototype.loadThemes = function(){
  if(this.themes){
    return this.themes;
  }

  var d = this.config.theme_root, themes = {};
  fs.readdirSync(d).forEach(function(fn){
    if(fs.statSync(path.join(d, fn)).isDirectory()){
      themes[fn.toLowerCase()] = fs.readdirSync(path.join(d, fn)).map(function(f){ return path.join(d, fn, f); });
    }
  });

  this.themes = themes;
  return this.themes;
};

HotImage.prototype.parseOptions = function(url){
  // PATH pattern: /ROUTE_PREFIX/SIZE[/THEME_OR_COLOR][.EXT]
  var config = this.config;
  var re_str = '^' + config.route_prefix + '\\/(\\d+(x\\d+)?)(\\/([0-9a-zA-Z\\/]+))?(\\.(png|jpe?g))?$',
      re = new RegExp(re_str, "i"),
      match = url.replace(/^\/+|\/+$/g,'').match(re);

  if(!match || !match[1]){
    return null;
  }

  var options = {theme: null, colors: null};
  options.size = match[1].split(/x/i).map(function(s){ return Math.max(parseInt(s) || 1, 1); });
  options.ext = (match[6] || "png").toLowerCase().replace('e','');

  if(options.size.length == 1){
    options.size.push(options.size[0]);
  }
  options.size = options.size.map(function(s){ return Math.min(config.max_size, s); })
  if(match[4]){ //color or theme has defined
    var str = match[4].toLowerCase();
    if(str.indexOf('/') != -1){ // slash seperated colors
      options.colors = str.split(/\/+/, 2).map(function(c, i){
        if(config.named_colors[c]){
          return config.named_colors[c];
        }
        if(/^[0-9a-z]{3}|[0-9a-z]{6}$/i.test(c)){
          return '#' + c;
        }
        return config.default_colors[i];
      });
    }else{
      options.theme = this.themes[str] && str;
    }
  }else{
    options.colors = config.default_colors;
  }

  return options;
};

HotImage.prototype.randomImageFile = function(theme){
  var images = this.themes[theme];
  return images[parseInt(images.length * Math.random())] || images[0];
};

HotImage.prototype.createImage = function(req, res, next){
  var options = this.parseOptions(req.url);
  // console.log(options)
  if(!options){
    return next();
  }

  var canvas = new Canvas(options.size[0], options.size[1]),
      context = canvas.getContext('2d'),
      text = options.size.join("x"),
      stream;

  if(options.theme){
    context.fillStyle = "#DDD";
    context.fillRect(0, 0, options.size[0], options.size[1]);
    var img = new Image;
    img.onload = function(){
      // TODO: crop image
      // var w = img.width, h = img.height;
      // if(w < )
      context.drawImage(img, 0, 0, options.size[0], options.size[1]);//, 0, 0, options.size[0], options.size[1]);
    };
    // console.log(this.randomImageFile(options.theme));
    img.src = this.randomImageFile(options.theme);
    context.save();
  }else{
    context.antialias = 'gray';
    context.font = '14px Arial';
    context.textBaseline = "middle";
    var text_rect = context.measureText(text);
    context.fillStyle = options.colors[0];
    context.fillRect(0, 0, options.size[0], options.size[1]);
    context.fillStyle = options.colors[1];
    context.fillText(text, (options.size[0] - text_rect.width) / 2, (options.size[1] - text_rect.emHeightAscent) / 2);
    context.save();
  }

  switch(options.ext){
    case 'jpg':
      stream = canvas.createJPEGStream({
        quality: 75
      });
      break;

    case 'png':
      stream = canvas.createPNGStream();
      break;
  }

  if(stream){
    stream.pipe(res, function(err){
      if(err){
        return next(err);
      }
      //TODO:: cache response
      res.header('Content-Type', 'image/' + options.ext);
      res.end();
    })
    return;
  }

};

module.exports = new HotImage({max_size: 1600});