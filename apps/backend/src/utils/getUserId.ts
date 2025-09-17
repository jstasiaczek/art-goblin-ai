import { FastifyRequest } from "fastify/types/request";

export const getUserIdFromRequest = (request: FastifyRequest): number => {
    const jwtUser = request.user as AuthUser;
    return jwtUser.sub;
}