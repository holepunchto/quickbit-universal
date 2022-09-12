import test from 'brittle'

test('new Index', async (t) => {
  const field = new Uint32Array(1 << 16)
  field[25000] = 1

  await t.test('native', async (t) => {
    const { Index } = await import('./index.js')

    const ops = 1000

    let r

    const elapsed = await t.execution(() => {
      for (let i = 0; i < ops; i++) {
        r = new Index(field)
      }
    })

    t.ok(r)

    t.comment(Math.round(ops / elapsed * 1e3) + ' ops/s')
  })

  await t.test('javascript', async (t) => {
    const { Index } = await import('./fallback.js')

    const ops = 100

    let r

    const elapsed = await t.execution(() => {
      for (let i = 0; i < ops; i++) {
        r = new Index(field)
      }
    })

    t.ok(r)

    t.comment(Math.round(ops / elapsed * 1e3) + ' ops/s')
  })
})

test('index.update', async (t) => {
  const ops = 1000000

  const field = new Uint32Array(1 << 16)
  field[25000] = 1

  await t.test('native', async (t) => {
    const { Index } = await import('./index.js')

    const index = new Index(field)

    let r

    const elapsed = await t.execution(() => {
      for (let i = 0; i < ops; i++) {
        r = index.update(25000)
      }
    })

    t.absent(r)

    t.comment(Math.round(ops / elapsed * 1e3) + ' ops/s')
  })

  await t.test('javascript', async (t) => {
    const { Index } = await import('./fallback.js')

    const index = new Index(field)

    let r

    const elapsed = await t.execution(() => {
      for (let i = 0; i < ops; i++) {
        r = index.update(25000)
      }
    })

    t.absent(r)

    t.comment(Math.round(ops / elapsed * 1e3) + ' ops/s')
  })
})

test('indexOf', async (t) => {
  const { indexOf, Index } = await import('./fallback.js')

  const field = new Uint32Array(1 << 16)
  field[25000] = 1

  await t.test('with index', async (t) => {
    const ops = 1000
    const index = new Index(field)

    let r

    const elapsed = await t.execution(() => {
      for (let i = 0; i < ops; i++) {
        r = indexOf(field, 1, index)
      }
    })

    t.is(r, 800000)

    t.comment(Math.round(ops / elapsed * 1e3) + ' ops/s')
  })

  await t.test('without index', async (t) => {
    const ops = 100

    let r

    const elapsed = await t.execution(() => {
      for (let i = 0; i < ops; i++) {
        r = indexOf(field, 1)
      }
    })

    t.is(r, 800000)

    t.comment(Math.round(ops / elapsed * 1e3) + ' ops/s')
  })
})
