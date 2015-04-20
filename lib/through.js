var util = require('util')
  , stream = require('stream')
  , Readable = stream.Readable
  , Writable = stream.Writable
  , PassThrough = stream.PassThrough
  , Duplex = stream.Duplex
  , Transform = stream.Transform;

/**
 *  Utility to find the options object argument.
 */
function options(args) {
  var i = args.length - 1, opts;
  for(;i >= 0;i--) {
    if(typeof args[i] === 'object') {
      opts = args[i];
      break;
    }
  }
  return opts;
}

/**
 *  Creates a stream subclass.
 */
function streamable(type, ctor, opts) {

  function Stream() {

    // allow non-new invocation
    if(!(this instanceof Stream)) {
      var args = [null].concat(Array.prototype.slice.call(arguments));
      return new (Function.prototype.bind.apply(Stream, args));
    }

    // set up options
    opts = options(arguments) || opts || {objectMode: true};
    opts.objectMode = opts.objectMode !== undefined
      ? opts.objectMode : true;

    // call stream constructor
    type.call(this, opts);

    // ensure object mode
    if(opts.objectMode && this._writableState) {
      this._writableState.objectMode = true;
    }
    if(opts.objectMode && this._readableState) {
      this._readableState.objectMode = true;
    }

    //console.log('new stream %s', this.id);

    // apply custom constructor
    if(typeof ctor === 'function') {
      ctor.apply(this, arguments);
    }
  }

  util.inherits(Stream, type);

  function toString() {
    var parts = [];
    parts.push(
      util.format('[%s:%s]', ctor ? ctor.name : Stream.name, type.name));
    if(this.id) {
      parts.push(this.id);
    }
    return parts.join(' ');
  }

  Stream.prototype.toString = toString;

  // inherit from constructor prototype
  if(typeof ctor === 'function') {
    for(var k in ctor.prototype) {
      Stream.prototype[k] = ctor.prototype[k];
    }
  }

  return Stream;
}

/**
 *  Creates a transform stream subclass.
 */
function transform(fn, flush, opts) {
  var type;
  opts = options(arguments) || {};
  type = streamable(Transform, opts.ctor, opts);
  if(typeof fn === 'function') {
    type.prototype._transform = fn;
  }
  if(typeof flush === 'function') {
    type.prototype._flush = flush;
  }
  return type;
}

/**
 *  Creates a passthrough, read, write or duplex stream subclass.
 */
function through(read, write, opts) {
  opts = options(arguments);
  var type
    , ctor = opts ? opts.ctor : null;
  read = typeof read === 'function' ? read : null;
  write = typeof write === 'function' ? write : null;
  if(!read && !write) {
    type = streamable(PassThrough, ctor, opts);
  }else if(read && !write) {
    type = streamable(Readable, ctor, opts);
    type.prototype._read = read;
  }else if(!read && write) {
    type = streamable(Writable, ctor, opts);
    type.prototype._write = write;
  }else{
    type = streamable(Duplex, ctor, opts);
    type.prototype._read = read;
    type.prototype._write = write;
  }
  return type;
}

/**
 *  Creates a pass through stream subclass that calls cork to buffer all
 *  input and write on end.
 *
 *  Useful when you need all the data before operations can begin.
 */
function cork() {
  return through({ctor: function Buffer(){this.cork()}});
}

/**
 *  Get a pass through stream class.
 */
function passthrough(opts) {
  return through(opts);
}

through.extend = streamable;
through.transform = transform;
through.cork = cork;
through.passthrough = passthrough;

module.exports = through;
