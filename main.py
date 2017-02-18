import logging

from flask import Flask, render_template, request, make_response
import os.path

app = Flask(__name__)

@app.route('/', defaults={ 'path': '' })
@app.route('/<path:path>')
def all(path):
  fn = 'dist' + request.path
  if (os.path.exists(fn) and not os.path.isdir(fn)):
    return make_response(open(fn).read())
  return make_response(open('./dist/cloud.html').read())

@app.errorhandler(500)
def server_error(e):
  logging.exception('An error occurred during a request.')
  return 'An internal error occurred.', 500
