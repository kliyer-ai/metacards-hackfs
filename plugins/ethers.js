import { ethers } from "ethers";

export default (context, inject) => {

  if (window.ethereum) {
    // A Web3Provider wraps a standard Web3 provider, which is
    // what Metamask injects as window.ethereum into each page
    const provider = new ethers.providers.Web3Provider(window.ethereum)

    // The Metamask plugin also allows signing transactions to
    // send ether and pay to change state within the blockchain.
    // For this, you need the account signer...
    const signer = provider.getSigner()

    inject('provider', provider)
    inject('signer', signer)
  }

}