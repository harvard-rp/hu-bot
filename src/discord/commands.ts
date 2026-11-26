export type CommandRequest = Readonly<{
  guildId: string | null;
  name: string;
}>;

export type CommandHandler = (request: CommandRequest) => Promise<void> | void;

export async function dispatchCommand(
  request: CommandRequest,
  guildId: string,
  handlers: ReadonlyMap<string, CommandHandler>,
): Promise<void> {
  if (request.guildId !== guildId) return;
  await handlers.get(request.name)?.(request);
}
