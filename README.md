# LLM Random Number Experiment

When picking a number between 1-100, do hashtag#LLMs pick randomly? Or pick like a human?

[Leniolabs](https://www.leniolabs.com/artificial-intelligence/2023/10/04/42-GPTs-answer-to-Life-the-Universe-and-Everything/) found that ChatGPT prefers 42.

When I re-ran the experiment, things changed a bit. Now, 47 is the new favorite.

But Claude 3 Haiku latched on to 42 as its favorite. Gemini's favorite is 72.

They all avoid multiples of 10 (10, 20, ...), repeated digits (11, 22, ...), single digits (1, 2, ...) and prefer 7-endings (27, 37, ...). These are clearly human biases -- avoiding regular / round numbers and seeking 7 as "random".

Strangely, they all avoid numbers ending with 1, and like 72, 73 and 56 a lot.

This repository contains the results of the experiment.

Here is the [code to generate the results](https://github.com/sanand0/ipython-notebooks/blob/master/llm-random-numbers.ipynb).
