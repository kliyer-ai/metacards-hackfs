import detectEthereumProvider from '@metamask/detect-provider'
import { ethers } from "ethers";

const connectProvider = async () => {
  const ethereum = await detectEthereumProvider()

  if (ethereum) {

    console.log('Ethereum successfully detected!')

    ethereum.request({ method: 'eth_requestAccounts' });

    console.log('Ethereum successfully connected!')

    await ethereum.request({ method: 'eth_requestAccounts' });

    const chainId = await ethereum.request({
      method: 'eth_chainId'
    })



    // A Web3Provider wraps a standard Web3 provider, which is
    // what Metamask injects as window.ethereum into each page
    const provider = new ethers.providers.Web3Provider(ethereum)

    // The Metamask plugin also allows signing transactions to
    // send ether and pay to change state within the blockchain.
    // For this, you need the account signer...
    const signer = provider.getSigner()

    return {
      provider,
      signer,
      chainId: Number(chainId),
      updateOnChainChange: () => {
        ethereum.on('chainChanged', handleChainChanged);

        function handleChainChanged(_chainId) {
          // We recommend reloading the page, unless you must do otherwise
          window.location.reload();
        }
      }
    }
  }
  return null
}

export default connectProvider

