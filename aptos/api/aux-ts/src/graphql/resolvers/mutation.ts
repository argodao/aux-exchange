import * as aux from "../../";
import { OrderType as AuxOrderType } from "../../clob/core/mutation";
import { DU } from "../../units";
import { auxClient } from "../connection";
import {
  MutationAddLiquidityArgs,
  MutationCancelOrderArgs,
  MutationCreateMarketArgs,
  MutationCreatePoolArgs,
  MutationDepositArgs,
  MutationPlaceOrderArgs,
  MutationRegisterCoinArgs,
  MutationRemoveLiquidityArgs,
  MutationSwapArgs,
  MutationTransferArgs,
  MutationWithdrawArgs,
  OrderType,
  Side,
} from "../generated/types";

export const mutation = {
  createPool(_parent: any, { createPoolInput }: MutationCreatePoolArgs) {
    const { coinTypeX, coinTypeY } = createPoolInput.poolInput;
    return aux.amm.core.mutation.createPoolPayload(auxClient, {
      // @ts-ignore
      sender: undefined,
      coinTypeX,
      coinTypeY,
      feeBps: (createPoolInput.feePercent * 100).toString(),
    });
  },

  registerCoin(_parent: any, { registerCoinInput }: MutationRegisterCoinArgs) {
    return {
      function: `0x1::managed_coin::register`,
      type_arguments: [registerCoinInput.coinType],
      arguments: [],
    };
  },

  async swap(_parent: any, { swapInput }: MutationSwapArgs) {
    const { coinTypeX, coinTypeY } = swapInput.poolInput;
    const [coinInfoX, coinInfoY] = await Promise.all([
      auxClient.getCoinInfo(coinTypeX),
      auxClient.getCoinInfo(coinTypeY),
    ]);
    return aux.amm.core.mutation.swapExactCoinForCoinPayload(auxClient, {
      // @ts-ignore
      sender: undefined,
      coinTypeIn: swapInput.coinTypeIn,
      coinTypeOut: swapInput.coinTypeOut,
      exactAmountAuIn: DU(swapInput.amountIn)
        .toAtomicUnits(coinInfoX.decimals)
        .toString(),
      minAmountAuOut: DU(0.9 * swapInput.minAmountOut)
        .toAtomicUnits(coinInfoY.decimals)
        .toString(),
    });
  },
  async addLiquidity(
    _parent: any,
    { addLiquidityInput }: MutationAddLiquidityArgs
  ) {
    const { coinTypeX, coinTypeY } = addLiquidityInput.poolInput;
    const [coinInfoX, coinInfoY] = await Promise.all([
      auxClient.getCoinInfo(coinTypeX),
      auxClient.getCoinInfo(coinTypeY),
    ]);
    return aux.amm.core.mutation.addLiquidityPayload(auxClient, {
      // @ts-ignore
      sender: undefined,
      coinTypeX,
      coinTypeY,
      amountAuX: DU(addLiquidityInput.amountX)
        .toAtomicUnits(coinInfoX.decimals)
        .toString(),
      amountAuY: DU(addLiquidityInput.amountY)
        .toAtomicUnits(coinInfoY.decimals)
        .toString(),
      maxSlippageBps: "50",
    });
  },
  async removeLiquidity(
    _parent: any,
    { removeLiquidityInput }: MutationRemoveLiquidityArgs
  ) {
    const { coinTypeX, coinTypeY } = removeLiquidityInput.poolInput;
    const pool = await aux.amm.core.query.pool(auxClient, {
      coinTypeX,
      coinTypeY,
    });
    return aux.amm.core.mutation.removeLiquidityPayload(auxClient, {
      // @ts-ignore
      sender: undefined,
      coinTypeX,
      coinTypeY,
      amountAuLP: DU(removeLiquidityInput.amountLP)
        .toAtomicUnits(pool!.coinInfoLP.decimals)
        .toString(),
    });
  },

  async createMarket(
    _parent: any,
    { createMarketInput }: MutationCreateMarketArgs
  ) {
    const { baseCoinType, quoteCoinType } = createMarketInput.marketInput;
    const [baseCoinInfo, quoteCoinInfo] = await Promise.all([
      auxClient.getCoinInfo(baseCoinType),
      auxClient.getCoinInfo(quoteCoinType),
    ]);
    // @ts-ignore
    return aux.clob.core.mutation.createMarketPayload(auxClient, {
      // @ts-ignore
      sender: undefined,
      baseCoinType,
      quoteCoinType,
      baseLotSize: DU(createMarketInput.baseLotSize)
        .toAtomicUnits(baseCoinInfo.decimals)
        .toString(),
      quoteLotSize: DU(createMarketInput.quoteLotSize)
        .toAtomicUnits(quoteCoinInfo.decimals)
        .toString(),
    });
  },
  async placeOrder(_parent: any, { placeOrderInput }: MutationPlaceOrderArgs) {
    const { baseCoinType, quoteCoinType } = placeOrderInput.marketInput;
    const market = await aux.clob.core.query.market(
      auxClient,
      baseCoinType,
      quoteCoinType
    );
    return aux.clob.core.mutation.placeOrderPayload(auxClient, {
      // @ts-ignore
      sender: { address: () => placeOrderInput.sender },
      market,
      isBid: placeOrderInput.side === Side.Buy ? true : false,
      limitPriceAu: DU(placeOrderInput.limitPrice)
        .toAtomicUnits(market.quoteCoinInfo.decimals)
        .toString(),
      quantityAu: DU(placeOrderInput.quantity)
        .toAtomicUnits(market.baseCoinInfo.decimals)
        .toString(),
      auxToBurnAu: DU(placeOrderInput.auxToBurn).toAtomicUnits(6).toString(),
      clientOrderId: placeOrderInput.clientOrderId.toString(),
      orderType: convertOrderType(placeOrderInput.orderType),
    });
  },
  cancelOrder(_parent: any, { cancelOrderInput }: MutationCancelOrderArgs) {
    const { baseCoinType, quoteCoinType } = cancelOrderInput.marketInput;
    return aux.clob.core.mutation.cancelOrderPayload(auxClient, {
      // @ts-ignore
      sender: { address: () => cancelOrderInput.sender },
      baseCoinType,
      quoteCoinType,
      orderId: cancelOrderInput.orderId,
    });
  },
  createAuxAccount() {
    return aux.vault.core.mutation.createAuxAccountPayload(auxClient);
  },
  async deposit(_parent: any, { depositInput }: MutationDepositArgs) {
    return aux.vault.core.mutation.depositPayload(auxClient, {
      coinType: depositInput.coinType,
      sender: depositInput.from,
      to: depositInput.to,
      amountAu: DU(depositInput.amount)
        .toAtomicUnits(
          (await auxClient.getCoinInfo(depositInput.coinType)).decimals
        )
        .toString(),
    });
  },
  async withdraw(_parent: any, { withdrawInput }: MutationWithdrawArgs) {
    return aux.vault.core.mutation.withdrawPayload(auxClient, {
      coinType: withdrawInput.coinType,
      sender: withdrawInput.from,
      amountAu: DU(withdrawInput.amount)
        .toAtomicUnits(
          (await auxClient.getCoinInfo(withdrawInput.coinType)).decimals
        )
        .toString(),
    });
  },
  async transfer(_parent: any, { transferInput }: MutationTransferArgs) {
    return aux.vault.core.mutation.transferPayload(auxClient, {
      sender: transferInput.from,
      recipient: transferInput.to,
      coinType: transferInput.coinType,
      amountAu: DU(transferInput.amount)
        .toAtomicUnits(
          (await auxClient.getCoinInfo(transferInput.coinType)).decimals
        )
        .toString(),
    });
  },
};

function convertOrderType(orderType: OrderType): AuxOrderType {
  if (orderType === OrderType.Limit) {
    return AuxOrderType.LIMIT_ORDER;
  } else if (orderType === OrderType.FillOrKill) {
    return AuxOrderType.FILL_OR_KILL_ORDER;
  } else if (orderType === OrderType.ImmediateOrCancel) {
    return AuxOrderType.IMMEDIATE_OR_CANCEL_ORDER;
  } else if (orderType === OrderType.PostOnly) {
    return AuxOrderType.POST_ONLY_ORDER;
  } else if (orderType === OrderType.PassiveJoin) {
    return AuxOrderType.PASSIVE_JOIN_ORDER;
  } else {
    throw new Error("Unhandled order type");
  }
}
