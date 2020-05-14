using CryptoPro.Sharpei;
using System;
using System.Collections;
using System.Linq;
using System.Security.Cryptography;
using System.Security.Cryptography.Pkcs;
using System.Security.Cryptography.X509Certificates;

namespace CryptoProWebExample.Models
{
	public class EncryptedDataModel
	{
		#region Public properties
		
		
		
		public string sessionKeyDiversData { get; set; }

		public string sessionKeyIV { get; set; }

		public string dataEncrypted { get; set; }

		public string encryptedSessionKey { get; set; }

		public string thumbprintCertificate { get; set; }

		public string thumbprintAnswerCertificate { get; set; }



		#endregion
		#region Private methods



		private X509Certificate2 _getCertificate(string sThumbprint)
		{
			X509Certificate2 retVal = null;
			X509Store store = new X509Store(StoreName.My, StoreLocation.CurrentUser);
			store.Open(OpenFlags.OpenExistingOnly);
			var certs = store.Certificates.Find(X509FindType.FindByThumbprint, sThumbprint, true);
			if (certs.Count > 0)
			{
				retVal = certs[0];
			}
			return retVal;
		}

		private static byte[] TrimArray(byte[] targetArray)
		{
			IEnumerator enum1 = targetArray.GetEnumerator();
			int i = 0;
			while (enum1.MoveNext())
			{
				if (enum1.Current.ToString().Equals("0"))
				{
					break;
				}
				i++;
			}
			byte[] returnedArray = new byte[i];
			for (int j = 0; j < i; j++)
			{
				returnedArray[j] = targetArray[j];
			}
			return returnedArray;
		}



		#endregion
		#region Public methods



		public X509Certificate2 GetCertificate()
		{
			return _getCertificate(thumbprintCertificate);
		}

		public X509Certificate2 GetAnswerCertificate()
		{
			return _getCertificate(thumbprintAnswerCertificate);
		}

		public byte[] GetMessage()
		{
			EnvelopedCms envelopedCms = new EnvelopedCms();
			envelopedCms.Decode(Convert.FromBase64String(dataEncrypted));
			envelopedCms.Decrypt(envelopedCms.RecipientInfos[0]);
			return envelopedCms.ContentInfo.Content;
		}

		public void EncryptAnswer(byte[] answerData)
		{
			X509Certificate2 certificate = GetAnswerCertificate();

			ContentInfo contentInfo = new ContentInfo(answerData);
			EnvelopedCms envelopedCms = new EnvelopedCms(contentInfo);
			CmsRecipient recipient = new CmsRecipient(
				SubjectIdentifierType.IssuerAndSerialNumber,
				certificate);
			envelopedCms.Encrypt(recipient);
			byte[] answer = envelopedCms.Encode();

			dataEncrypted = Convert.ToBase64String(answer);
			sessionKeyIV = String.Empty;
			sessionKeyDiversData = String.Empty;
			encryptedSessionKey = String.Empty;
		}



		#endregion
	}
}