import { COOKIE_NAME } from "../shared/const.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { z } from "zod";
import * as janinRooms from "./janinRooms";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  janinRooms: router({
    create: publicProcedure.input(z.object({ playerName: z.string().min(1).max(18) })).mutation(({ input }) => janinRooms.createRoom(input.playerName)),
    join: publicProcedure.input(z.object({ roomCode: z.string().trim().min(4).max(8), playerName: z.string().min(1).max(18) })).mutation(({ input }) => janinRooms.joinRoom(input.roomCode, input.playerName)),
    snapshot: publicProcedure.input(z.object({ roomCode: z.string().trim().min(4).max(8), token: z.string().min(1).max(64) })).query(({ input }) => janinRooms.getRoom(input.roomCode, input.token)),
    action: publicProcedure.input(z.object({ roomCode: z.string().trim().min(4).max(8), token: z.string().min(1).max(64), type: z.enum(["draw", "discard"]), source: z.enum(["deck", "discard"]).optional(), cardId: z.string().max(32).optional() })).mutation(({ input }) => janinRooms.submitRoomAction(input)),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
