var Canvas = require('canvas'), 
    Image = Canvas.Image,
    Font = Canvas.Font,
    fs = require('fs'),
    path = require('path'),
    crypto = require('crypto');

var HotImage = function(config){
  this.config = HotImage.defaultConfig;
  this.configure(config);
  this.loadThemes();
};

HotImage.defaultConfig = {
  route_prefix: 'g',
  theme_root: __dirname + '/images/',
  named_colors: {
    red: '#FF0000',
    green: '#00FF00',
    blue: '#0000FF'
  },
  default_colors: ["#DDD", "#666"],
  max_size: 1920,
  fonts: {
    'angelina': __dirname + '/fonts/' + 'angelina.ttf'
  },
  jpg_quantity: 75
};

HotImage.prototype.configure = function(config){
  if(typeof config == 'object'){
    for(var k in config){
      this.config[k] = config[k];
    }
  }
  return this;
};

HotImage.prototype.loadThemes = function(){
  if(this.themes){
    return this.themes;
  }

  var d = this.config.theme_root, themes = {}, sta;
  fs.readdirSync(d).forEach(function(fn){
    if(fs.statSync(path.join(d, fn)).isDirectory()){
      themes[fn.toLowerCase()] = fs.readdirSync(path.join(d, fn)).map(function(f){
        f = path.join(d, fn, f);
        return {
          file: f,
          mtime: fs.statSync(f).mtime.getTime()
        };
      });
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

  var options = {theme: null, colors: null, font: 'angelina'};
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

  var mt = "", f;
  if(options.theme){
    f = this.randomImageFile(options.theme);
    options.theme_file = f.file;
    mt = f.mtime;
  }

  options.cache_id = [options.size.join("x"), (options.colors || []).join(','), options.theme_file, mt].join("-").toLowerCase();
  options.cache_id = crypto.createHash('md5').update(options.cache_id, 'utf8').digest('hex');
  
  return options;
};

HotImage.prototype.randomImageFile = function(theme){
  var images = this.themes[theme];
  return images[parseInt(images.length * Math.random())] || images[0];
};

HotImage.prototype.createImage = function(req, res, next){
  var options = this.parseOptions(req.url);
  if(!options){
    return next();
  }

  if(req.get('If-None-Match') == options.cache_id){
    res.status(304).end();
    return;
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
      var x = 0, y = 0, w, h, rs = img.width / img.height, rd = options.size[0] / options.size[1];
      if(rs <= 1){
        w = options.size[0];
        h = (w / img.width) * img.height;
        y = (h - options.size[1]) / -2;
        if( h < options.size[1]){
          h = options.size[1];
          w = (h / img.height) * img.width;
          x = (w - options.size[0]) / -2;
          y = 0;
        }
      }else{
        h = options.size[1];
        w = (h / img.height) * img.width;
        x = (w - options.size[0]) / -2;
        if(w < options.size[0]){
          w = options.size[0];
          h = (w / img.width) * img.height;
          x = 0;
          y = (h - options.size[1]) / -2;
        }
      }
      context.drawImage(img, x, y, w, h);
    };
    img.src = options.theme_file;
    context.save();
  }else{
    var font_size = [[14, 0, 100], [18, 101, 200], [24, 201, 500], [32, 501, 800], [40, 801, 10000]].filter(function(r, i){
      return r[1] <= options.size[0] && r[2] >= options.size[0];
    })[0][0] || 14;
    context.addFont(new Font(options.font, this.config.fonts[options.font]));
    context.antialias = 'gray';
    context.font = font_size + 'px ' + options.font;
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
        quality: this.config.jpg_quantity
      });
      break;

    case 'png':
      stream = canvas.createPNGStream();
      break;
  }

  if(stream){
    res.setHeader('Content-Type', 'image/' + options.ext);
    var exp = new Date(), age = 86400*1;
    res.setHeader('Content-Control', 'public, max-age=' + age);
    exp.setTime(exp.getTime() + age*1000);
    res.setHeader('Expires', exp.toUTCString());
    res.setHeader('ETag', options.cache_id);
    stream.pipe(res, function(err){
      if(err){
        return next(err);
      }
      res.end();
    });
  }else{
    next();
  }
};

var hotimage = new HotImage();

module.exports = function(config){
  hotimage.configure(config);

  return function(req, res, next){
    if(req.method != 'GET'){
      res.status(405).end();
      return;
    }
    hotimage.createImage(req, res, next);
  }
};