# from flask import Flask, abort, jsonify, request, render_template
from joblib import load
from features import *
import json
import sys

pipeline = load('./pipeline.sav')
# print("chchchchchcchcchchchc")
# # app = Flask(__name__)

# @app.route('/analyze', methods=['POST'])
# def analyze():

# requestJson = request.get_json(force=True)
comments = list(sys.argv[1].split(","))   # requestJson['arr']
# comments = json.loads(comments)
# comments = [{'text': "good"}, {'text': "bad"}]
# print("coo", comments)
good = 0
bad = 0
for comment in comments:
    query = comment
    query = remove_punctuation_stopwords_lemma(query)
    pred = pipeline.predict([query])
    if pred[0] == "positive":
        good += 1
    else:
        bad += 1
    # return jsonify({'good':good,'bad':bad})

resp = {'good': good, 'bad': bad}
print(json.dumps(resp))
sys.stdout.flush()
# if __name__ == '__main__':
#     app.run(port=8080, debug=True)
