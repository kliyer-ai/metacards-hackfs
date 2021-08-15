import detectEthereumProvider from '@metamask/detect-provider'

export default async function ({ redirect }) {
  const provider = await detectEthereumProvider()
  if (!provider) {
    return redirect('/install-wallet')
  }
}