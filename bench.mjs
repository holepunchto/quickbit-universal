import test from 'brittle'

test('Index.from', async (t) => {
  const field = new Uint32Array(1 << 16)
  field[25000] = 1

  await t.test('native', async (t) => {
    const { Index } = await import('./index.js')

    const ops = 1000

    let r

    const elapsed = await t.execution(() => {
      for (let i = 0; i < ops; i++) {
        r = Index.from(field)
      }
    })

    t.ok(r)

    t.comment(Math.round((ops / elapsed) * 1e3) + ' ops/s')
  })

  await t.test('javascript', async (t) => {
    const { Index } = await import('./fallback.js')

    const ops = 100

    let r

    const elapsed = await t.execution(() => {
      for (let i = 0; i < ops; i++) {
        r = Index.from(field)
      }
    })

    t.ok(r)

    t.comment(Math.round((ops / elapsed) * 1e3) + ' ops/s')
  })
})

test('index.update', async (t) => {
  const ops = 1000000

  const field = new Uint32Array(1 << 16)
  field[25000] = 1

  await t.test('native', async (t) => {
    const { Index } = await import('./index.js')

    const index = Index.from(field)

    let r

    const elapsed = await t.execution(() => {
      for (let i = 0; i < ops; i++) {
        r = index.update(25000)
      }
    })

    t.absent(r)

    t.comment(Math.round((ops / elapsed) * 1e3) + ' ops/s')
  })

  await t.test('javascript', async (t) => {
    const { Index } = await import('./fallback.js')

    const index = Index.from(field)

    let r

    const elapsed = await t.execution(() => {
      for (let i = 0; i < ops; i++) {
        r = index.update(25000)
      }
    })

    t.absent(r)

    t.comment(Math.round((ops / elapsed) * 1e3) + ' ops/s')
  })
})

test('findFirst', async (t) => {
  const field = new Uint32Array(1 << 16)
  field[25000] = 1

  await t.test('native', async (t) => {
    const { findFirst, Index } = await import('./index.js')

    await t.test('with index', async (t) => {
      const ops = 1000000
      const index = Index.from(field)

      let r

      const elapsed = await t.execution(() => {
        for (let i = 0; i < ops; i++) {
          r = findFirst(field, true, index.skipFirst(false))
        }
      })

      t.is(r, 800000)

      t.comment(Math.round((ops / elapsed) * 1e3) + ' ops/s')
    })

    await t.test('without index', async (t) => {
      const ops = 100000

      let r

      const elapsed = await t.execution(() => {
        for (let i = 0; i < ops; i++) {
          r = findFirst(field, true)
        }
      })

      t.is(r, 800000)

      t.comment(Math.round((ops / elapsed) * 1e3) + ' ops/s')
    })
  })

  await t.test('javascript', async (t) => {
    const { findFirst, Index } = await import('./fallback.js')

    await t.test('with index', async (t) => {
      const ops = 1000000
      const index = Index.from(field)

      let r

      const elapsed = await t.execution(() => {
        for (let i = 0; i < ops; i++) {
          r = findFirst(field, true, index.skipFirst(false))
        }
      })

      t.is(r, 800000)

      t.comment(Math.round((ops / elapsed) * 1e3) + ' ops/s')
    })

    await t.test('without index', async (t) => {
      const ops = 100

      let r

      const elapsed = await t.execution(() => {
        for (let i = 0; i < ops; i++) {
          r = findFirst(field, true)
        }
      })

      t.is(r, 800000)

      t.comment(Math.round((ops / elapsed) * 1e3) + ' ops/s')
    })
  })
})
