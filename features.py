from nltk.stem import WordNetLemmatizer
from nltk.corpus import stopwords
import numpy as np
import pandas as pd

import os
import re
import nltk
nltk.download('stopwords')
nltk.download('wordnet')


def remove_punctuation_stopwords_lemma(query):
    review = ''
    lemmatizer = WordNetLemmatizer()
    review = re.sub('[^a-zA-Z]', ' ', query)
    review = review.lower()
    review = review.split()

    review = [str(lemmatizer.lemmatize(word))
              for word in review if not word in stopwords.words('english')]
    review = ' '.join(review)
    # print("review",type(review))
    return review
