'use client';

import { useReadContract, useWriteContract, useWaitForTransactionReceipt } from 'wagmi';
import { formatUnits, parseUnits } from 'viem';
import { CONTRACTS } from '@/constants/contracts';
import depositAbi from '@/constants/abi/deposit.json';

const DEPOSIT_ADDRESS = CONTRACTS.PLEDGE as `0x${string}`;

// 查询用户质押金额
export function useUserDepositedAmount(address?: `0x${string}`) {
  const { data, ...rest } = useReadContract({
    address: DEPOSIT_ADDRESS,
    abi: depositAbi,
    functionName: 'viewUserDepositedAmount',
    args: address ? [address] : undefined,
    query: {
      enabled: !!address,
    },
  });

  const formatted = data ? formatUnits(data as bigint, 18) : '0';

  return {
    amount: data as bigint | undefined,
    formatted,
    ...rest,
  };
}

// 查询最低质押金额
export function useMinDeposit() {
  const { data, ...rest } = useReadContract({
    address: DEPOSIT_ADDRESS,
    abi: depositAbi,
    functionName: 'minDeposit',
  });

  const formatted = data ? formatUnits(data as bigint, 18) : '0';

  return {
    minDeposit: data as bigint | undefined,
    formatted,
    ...rest,
  };
}

// 质押
export function useDeposit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const deposit = (amount: string, decimals = 18) => {
    const amountBigInt = parseUnits(amount, decimals);
    writeContract({
      address: DEPOSIT_ADDRESS,
      abi: depositAbi,
      functionName: 'userDeposit',
      args: [amountBigInt],
    });
  };

  return {
    deposit,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

// 提取质押
export function useWithdrawDeposit() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdraw = () => {
    writeContract({
      address: DEPOSIT_ADDRESS,
      abi: depositAbi,
      functionName: 'userWithdraw',
      args: [],
    });
  };

  return {
    withdraw,
    hash,
    isPending,
    isConfirming,
    isSuccess,
    error,
  };
}

