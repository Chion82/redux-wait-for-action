BIN=node_modules/.bin

build:
	$(BIN)/babel src --out-dir lib

clean:
	rm -rf lib

test: lint
	NODE_ENV=test echo 'No test scripts specified.'

lint:
	$(BIN)/eslint src
