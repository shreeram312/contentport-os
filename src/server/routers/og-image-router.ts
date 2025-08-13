import { z } from 'zod'
import { j } from '../jstack'
import ogs from 'open-graph-scraper'

export const ogImageRouter = j.router({
  fetch: j.procedure
    .input(
      z.object({
        url: z.string(),
      }),
    )
    .query(async ({ c, input }) => {
      try {
        const responses = await ogs({ url: input.url, timeout: 10000 })
        if (!responses.result.ogImage || !responses.result.ogImage[0]?.url) {
          return c.json(
            { success: false, error: 'No OG image found', requestUrl: input.url },
            404,
          )
        }
        const result = {
          title: responses.result.ogTitle,
          description: responses.result.ogDescription,
          image: responses.result.ogImage[0]?.url,
          siteName: responses.result.ogSiteName,
        }
        return c.json(result)
      } catch (e) {
        console.error(e)
        return c.json({ error: 'Failed to fetch OG image' }, 500)
      }
    }),
})

export type OgImageRouter = typeof ogImageRouter
