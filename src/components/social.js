import {
  FaGithub,
  FaGitlab,
  FaMedium,
  FaStackOverflow,
  FaTwitter,
} from 'react-icons/fa'
import React from 'react'
import { useStaticQuery, graphql } from 'gatsby'
import ListInline from './list-inline'

const SocialLinks = () => {
  const { site } = useStaticQuery(graphql`
    query {
      site {
        siteMetadata {
          social {
            github
            gitlab
            medium
            stackoverflow
            twitter
          }
        }
      }
    }
  `)

  const {
    github,
    gitlab,
    medium,
    twitter,
    stackoverflow,
  } = site.siteMetadata.social

  return (
    <ListInline>
      <li>
        <a
          href={`https://www.twitter.com/${twitter}`}
          target="_blank"
          rel="noopener"
        >
          <FaTwitter title="Twitter Profile" />
        </a>
      </li>
      <li>
        <a
          href={`https://stackoverflow.com/users/${stackoverflow}`}
          target="_blank"
          rel="noopener"
        >
          <FaStackOverflow title="Stackoverflow Profile" />
        </a>
      </li>
      <li>
        <a href={`https://github.com/${github}`} target="_blank" rel="noopener">
          <FaGithub title="Github Profile" />
        </a>
      </li>
      <li>
        <a href={`https://gitlab.com/${gitlab}`} target="_blank" rel="noopener">
          <FaGitlab title="Gitlab Profile" />
        </a>
      </li>
      <li>
        <a
          href={`https://medium.com/@${medium}`}
          target="_blank"
          rel="noopener"
        >
          <FaMedium title="Medium Profile" />
        </a>
      </li>
    </ListInline>
  )
}

export default SocialLinks
