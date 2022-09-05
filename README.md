# quickbit-universal

Universal wrapper for https://github.com/holepunchto/libquickbit with a JavaScript fallback.

```sh
npm install quickbit-universal
```

## Usage

```js
const { get, set, indexOf } = require('quickbit-native')

const field = Buffer.alloc(256) // 2048 bits

const changed = set(field, 1000)
// true

get(field, 1000)
// true

indexOf(field, true)
// 1000
```

## API

#### `const b = get(field, bit)`

Get the given bit, which will either be `true` (set) or `false` (unset).

#### `const changed = set(field, bit[, value])`

Set the given bit to `value`, which defaults to `true`. Returns `true` if the bit changed, otherwise `false`.

#### `const i = indexOf(field, value[, position][, index])`

Return the index of the first occurrence of `value`, or `-1` if not found. If `position` is given, return the first index that is greater than or equal to `position`. An `index` may be passed to improve performance.

#### `const i = lastIndexOf(field, value[, position][, index])`

Return the index of the last occurrence of `value`, or `-1` if not found. If `position` is given, return the last index that is less than or equal to `position`. An `index` may be passed to improve performance.

### Indexing

#### `const index = new Index(field)`

Construct an index of the bits in `field`.

#### `const changed = index.update(bit)`

Reindex the given bit.

## License

ISC
