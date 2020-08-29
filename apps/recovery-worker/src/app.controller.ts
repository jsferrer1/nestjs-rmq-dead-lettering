import {
  MakeBurgerFailurePayload,
  MakeBurgerPayload,
  MAKE_BURGER_FAILURE_PATTERN,
  MAKE_BURGER_PATTERN,
  queueOptions,
} from '@app/shared';
import { Controller, Inject, Logger } from '@nestjs/common';
import {
  ClientProxy,
  Ctx,
  EventPattern,
  Payload,
  RmqContext,
} from '@nestjs/microservices';

@Controller()
export class AppController {
  readonly maxRetries = 3;

  constructor(
    @Inject(queueOptions.burger.name) private burgerQueue: ClientProxy,
  ) {}

  private emitBurgerFailure(payload: MakeBurgerFailurePayload) {
    this.burgerQueue.emit(MAKE_BURGER_FAILURE_PATTERN, payload);
  }

  private emitMakeBurger(payload: MakeBurgerPayload) {
    this.burgerQueue.emit(MAKE_BURGER_PATTERN, payload);
  }

  @EventPattern(MAKE_BURGER_PATTERN)
  makeBurgerEvent(
    @Payload() payload: MakeBurgerPayload,
    @Ctx() context: RmqContext,
  ) {
    const retryCount = (payload.retryCount ?? 0) + 1;

    if (retryCount > this.maxRetries) {
      Logger.warn(
        `Emit failure for of burger for ${payload.customer}. Max retries exceeded.`,
      );
      this.emitBurgerFailure({ customer: payload.customer });
    } else {
      Logger.log(`Emit retry ${retryCount} of burger for ${payload.customer}`);
      this.emitMakeBurger({ ...payload, retryCount });
    }

    context.getChannelRef().ack(context.getMessage());
  }
}